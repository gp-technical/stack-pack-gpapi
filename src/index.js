import request from 'stack-pack-request'
import crypto from 'crypto'
import winston from 'winston'
import util from 'util'

const promises = {}
const promisePush = (key, timeout) => new Promise((resolve, reject) => promises[key] = {resolve, reject, timeout})
const promisePop = key => [promises[key], delete promises[key]][0]

const attachProxy = (opts) => {
  const {app, apiUrl} = opts
  app.use('/gpapi', async (req, res, next) => {
    try {
      await ensureApplicationToken(opts)
      await ensureUserToken(opts)
      var url = `${apiUrl}${req.path}/${app.get('user-token')}`
      switch (req.method) {
        case 'POST':
          const resPost = await request.post(url, req.body)
          res.send(resPost)
          break
        case 'GET':
          url += `${getQueryString(req.url)}`
          const resGet = await request.get(url)
          res.json(resGet)
          break
        default:
          throw new Error(`The requested method is not supported: ${req.method}`)
      }
    } catch (inner) {
      const err = new Error('GP API proxy call failed.')
      err.inner = inner
      winston.error(util.inspect(err))
      res.sendStatus(err.inner.StatusCode)
    }
  })
}

const ensureApplicationToken = async (opts) => {
  const {app} = opts
  if (app.get('application-token')) return
  winston.info('GP API:', await apiCheck())
  await requestCallback(opts)
}

const ensureUserToken = async (opts) => {
  const {app, apiUrl} = opts
  var url = `${apiUrl}/security/validate/user`
  const payload = {ApplicationToken: app.get('application-token'), UserToken: app.get('user-token')}
  try {
    await request.post(url, payload)
  } catch (err) {
    if (err.Name === 'NoUserForToken') {
      try {
        await setUserToken(opts)
      } catch (err) {
        if (err.Name === 'NoApplicationForToken') {
          await requestCallback(opts)
        } else {
          throw err
        }
      }
    } else {
      throw err
    }
  }
}

const getQueryString = (url) => {
  return (url.indexOf('?') > -1) ? `?${url.substr(url.indexOf('?') + 1)}` : ''
}

const attachCallback = (opts) => {
  const {app, keyPublic} = opts

  app.get('/security/ping', async (req, res) => {
    res.send(`The gp-api security callback is mounted : ${new Date().toLocaleString('en-GB')}`)
  })

  app.post('/security/login/application/callback', async (req, res) => {
    const {resolve, reject, timeout} = promisePop(keyPublic)
    clearTimeout(timeout)
    try {
      await processCallback(opts, req.body)
      resolve(setUserToken(opts))
      res.sendStatus(200)
    } catch (inner) {
      const err = new Error('Failed to process GP API callback.')
      err.inner = inner
      winston.error(util.inspect(err))
      res.sendStatus(500)
      reject(err)
    }
  })
}

const requestCallback = async ({apiUrl, keyPublic}) => {
  await request.get(`${apiUrl}/security/request-callback/application/${keyPublic}`)
  const timeout = setTimeout(() => {
    promisePop(keyPublic).reject('GP API: The callback request timed out. Check the GP API server output')
  }, 5000)
  return promisePush(keyPublic, timeout)
}

const processCallback = async ({app, apiUrl, keyPublic, keyPrivate}, {iv, token}) => {
  const secret = new Buffer(keyPrivate, 'utf-8')
  const vector = new Buffer(iv, 'base64')
  const encrypted = new Buffer(token, 'base64')
  const decipher = crypto.createDecipheriv('des3', secret, vector)
  let decrypted = decipher.update(encrypted, 'binary', 'ascii')
  decrypted += decipher.final('ascii')
  const application = await request.get(`${apiUrl}/security/login/application/${keyPublic}/${decrypted}`)
  winston.info(`GP API: App Authenticated : Token: ${application.Token}`)
  app.set('application-token', application.Token)
}

const setUserToken = async ({app, apiUrl, keyAdmin}) => {
  var url = `${apiUrl}/security/login/application/gpapi`
  const payload = {ApplicationToken: app.get('application-token')}
  if (keyAdmin) {
    url += '/admin'
    payload.AdminKey = keyAdmin
  }
  const {token} = await request.post(url, payload)
  winston.info(`GP API: User Authenticated: Token: ${token}`)
  app.set('user-token', token)
  return token
}

var apiCheck = undefined
const attachCheck = async ({apiUrl}) => {
  apiCheck = async () => {
    return {
      api: await request.get(`${apiUrl}/`),
      db: await request.get(`${apiUrl}/db-check`)
    }
  }
}

const check = async () => {
  return await apiCheck()
}

var apiGetProfileFromToken = undefined
const attachGetProfileFromToken = async ({apiUrl}) => {
  apiGetProfileFromToken = async (app, userToken) => {
    const user = await request.get(`${apiUrl}/security/login/user/token/${userToken}`)
    const profile = {nameId: user.Id, firstname: user.FirstName, lastname: user.LastName, email: user.Email}
    if (user.SubscriptionId) {
      const hierarchy = await get(`/hierarchy/subscription/${user.SubscriptionId}`)
      profile.client = {id: hierarchy.ClientId, name: hierarchy.ClientName}
      profile.subscription = {id: hierarchy.SubscriptionId, name: hierarchy.SubscriptionName}
    }
    return profile
  }
}

const getProfileFromToken = async (app, userToken) => {
  return apiGetProfileFromToken(app, userToken)
}

const handshake = async (opts) => {
  try {
    attachCheck(opts)
    attachGetProfileFromToken(opts)
    attachProxy(opts)
    attachCallback(opts)
    return await requestCallback(opts)
  } catch (inner) {
    const err = new Error('A call to the GP API has failed')
    err.inner = inner
    throw err
  }
}

const get = async (path) => {
  if (path.startsWith('/')) {
    path = path.substring(1)
  }
  return await request.get(`${process.env.API_ROOT}/gpapi/${path}`)
}

const post = async (path, payload) => {
  if (path.startsWith('/')) {
    path = path.substring(1)
  }
  return await request.post(`${process.env.API_ROOT}/gpapi/${path}`, payload)
}

export default {handshake, get, post, check, getProfileFromToken}
