import request from 'stack-pack-request'
import { log } from '@gp-technical/stack-pack-util'
import crypto from 'crypto'

var handshakeRequired = true

const attachProxy = opts => {
  const { app, apiUrl } = opts

  app.use('/gpapi/ping', async (req, res, next) => {
    res.send(`The GPAPI proxy is alive and relaying to: ${apiUrl}`)
  })

  const gpapiProxy = async (req, res, next) => {
    try {
      await ensureApplicationToken(opts)
      await ensureUserToken(opts)
      var url = `${apiUrl}${req.path}/${app.get('user-token')}`
      switch (req.method) {
        case 'POST':
          const resPost = await request.postJson(url, req.body, {
            headers: {
              'Content-type': 'application/json'
            }
          })
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
      if (inner.Name === 'NoUserForToken') {
        try {
          await resetUserToken(opts)
          gpapiProxy(req, res, next)
        } catch (err) {
          if (err.Name === 'NoApplicationForToken') {
            await setTokens(opts)
            gpapiProxy(req, res, next)
          } else {
            throw err
          }
        }
      } else {
        log.error(inner, 'GP API proxy call failed.')
        res.sendStatus(inner.StatusCode || 500)
      }
    }
  }

  app.use('/gpapi', gpapiProxy)
}

const ensureApplicationToken = async opts => {
  const { app } = opts
  if (app.get('application-token')) return
  await setTokens(opts)
}

const ensureUserToken = async opts => {
  const { app } = opts
  if (app.get('user-token')) return
  await setUserToken(opts)
}

const getQueryString = url => {
  return url.indexOf('?') > -1 ? `?${url.substr(url.indexOf('?') + 1)}` : ''
}

const setTokens = async opts => {
  const health = await apiCheck()
  const applicationToken = await setApplicationToken(opts)
  const userToken = await setUserToken(opts)
  log.logger().info(`GP API
      - api-url     : ${health.url}
      - api-ping    : ${health.ping}
      - db-check    : ${health.db}
      - app-token   : ${applicationToken}
      - user-token  : ${userToken}`)
}

const setApplicationToken = async ({ app, apiUrl, keyPublic, keyPrivate }) => {
  const { IV, Token } = await request.get(
    `${apiUrl}/security/encryptedToken/application/${keyPublic}`
  )
  const secret = Buffer.from(keyPrivate, 'utf-8')
  const vector = Buffer.from(IV, 'base64')
  const encrypted = Buffer.from(Token, 'base64')
  const decipher = crypto.createDecipheriv('des3', secret, vector)
  let decrypted = decipher.update(encrypted, 'binary', 'ascii')
  decrypted += decipher.final('ascii')
  const application = await request.get(
    `${apiUrl}/security/login/application/${keyPublic}/${decrypted}`
  )
  app.set('application-token', application.Token)
  return app.get('application-token')
}

const setUserToken = async ({ app, apiUrl, keyAdmin }) => {
  var url = `${apiUrl}/security/login/application/gpapi`
  const payload = { ApplicationToken: app.get('application-token') }
  const { token } = await request.post(url, payload)
  app.set('user-token', token)
  return token
}

const resetUserToken = async opts => {
  const token = await setUserToken(opts)
  log.logger().info(`GP API - reset user-token = ${token}`)
}

var apiCheck
const attachCheck = async ({ apiUrl }) => {
  apiCheck = async () => {
    return {
      url: apiUrl,
      ping: await request.get(`${apiUrl}/`, {
        timeout: parseInt(process.env.GP_API_TIMEOUT) || 3000
      }),
      db: await request.get(`${apiUrl}/db-check`, {
        timeout: parseInt(process.env.GP_API_TIMEOUT) || 10000
      })
    }
  }
}

const check = async () => {
  return apiCheck()
}

var apiGetProfileFromToken
const attachGetProfileFromToken = async ({ apiUrl }) => {
  apiGetProfileFromToken = async (app, userToken) => {
    const user = await request.get(`${apiUrl}/security/login/user/token/${userToken}`)
    const profile = {
      nameId: user.Id,
      firstname: user.FirstName,
      lastname: user.LastName,
      email: user.Email,
      token: userToken
    }
    if (user.SubscriptionId) {
      const hierarchy = await get(`/hierarchy/subscription/${user.SubscriptionId}`)
      profile.client = { id: hierarchy.ClientId, name: hierarchy.ClientName }
      profile.subscription = { id: hierarchy.SubscriptionId, name: hierarchy.SubscriptionName }
    }
    return profile
  }
}

const getProfileFromToken = async (app, userToken) => {
  return apiGetProfileFromToken(app, userToken)
}

const requiresHandshake = () => {
  return handshakeRequired === true
}

const handshake = async opts => {
  try {
    attachCheck(opts)
    attachGetProfileFromToken(opts)
    attachProxy(opts)
    await setTokens(opts)
    handshakeRequired = false
  } catch (inner) {
    const err = new Error('A call to the GP API has failed')
    err.inner = inner
    throw err
  }
}

const get = async (path, opts) => {
  if (path.startsWith('/')) {
    path = path.substring(1)
  }
  return request.get(`${process.env.API_ROOT}/gpapi/${path}`, opts)
}

const post = async (path, payload, opts) => {
  if (path.startsWith('/')) {
    path = path.substring(1)
  }

  return request.post(`${process.env.API_ROOT}/gpapi/${path}`, payload, opts)
}

export default { handshake, requiresHandshake, get, post, check, getProfileFromToken }
