import request from 'stack-pack-request'
import QueryString from 'querystring'
import { log } from '@gp-technical/stack-pack-util'
import crypto from 'crypto'

var handshakeRequired = true

var gpapiProxyInstance
var getGpapiProxy = () => {
  if (gpapiProxyInstance) {
    return gpapiProxyInstance
  }
  var gpapiProxy = global.GPAPI_PROXY_INSTANCE
  if (gpapiProxy) {
    return gpapiProxy
  }
  throw new Error('gpapiProxy is undefined')
}

const attachProxy = opts => {
  const { app, apiUrl } = opts

  app.use('/gpapi/ping', async (req, res, next) => {
    res.send(`The GPAPI proxy is alive and relaying to: ${apiUrl}`)
  })

  // local use without http call
  var gpapiProxy = async ({ path, body, method, query, withToken = true }) => {
    try {
      await ensureApplicationToken(opts)
      await ensureUserToken(opts)
      let url = `${apiUrl}${path}`
      if (withToken) url += `/${app.get('user-token')}`
      url += `?${QueryString.stringify(query)}`
      switch (method) {
        case 'POST':
          const resPost = await request.postJson(url, body, {
            headers: {
              'Content-type': 'application/json'
            }
          })
          return resPost
        case 'GET':
          const resGet = await request.get(url)
          return resGet
        default:
          throw new Error(`The requested method is not supported: ${method}`)
      }
    } catch (inner) {
      if (inner.Name === 'NoUserForToken') {
        try {
          await resetUserToken(opts)
          return gpapiProxy({ path, body, method, query })
        } catch (err) {
          if (err.Name === 'NoApplicationForToken') {
            await setTokens(opts)
            return gpapiProxy({ path, body, method, query })
          } else {
            throw err
          }
        }
      } else {
        log.error(inner, 'GP API proxy call failed.')
        throw new Error(inner.StatusCode || 500)
      }
    }
  }

  global.GPAPI_PROXY_INSTANCE = gpapiProxy
  // deprecated
  // delete on major version change
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

const setUserToken = async ({ app, apiUrl }) => {
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
  apiGetProfileFromToken = async userToken => {
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

const getProfileFromToken = async userToken => {
  return apiGetProfileFromToken(userToken)
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

const fixPath = path => (!path.startsWith('/') ? `/${path}` : path)

const get = (path, opts) => {
  path = fixPath(path)
  const gpapiProxy = getGpapiProxy()
  return gpapiProxy({ path, method: 'GET', query: opts })
}

const getNoToken = (path, opts) => {
  path = fixPath(path)
  const gpapiProxy = getGpapiProxy()
  return gpapiProxy({ path, method: 'GET', query: opts, withToken: false })
}

const post = (path, payload, opts) => {
  path = fixPath(path)
  const gpapiProxy = getGpapiProxy()
  return gpapiProxy({ path, method: 'POST', body: payload, query: opts })
}

export default { handshake, requiresHandshake, get, getNoToken, post, check, getProfileFromToken }
