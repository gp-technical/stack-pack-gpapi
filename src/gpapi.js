import request from 'stack-pack-request'
import QueryString from 'querystring'
import crypto from 'crypto'
import winston from 'winston'
import util from 'util'
var app = require.main.require('express')

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
  var gpapiProxy = async ({ path, body, method, query }) => {
    try {
      await ensureApplicationToken(opts)
      await ensureUserToken(opts)
      var url = `${apiUrl}${path}/${app.get('user-token')}`
      url += QueryString.stringify(query)
      switch (method) {
        case 'POST':
          const resPost = await request.post(url, body)
          return resPost
        case 'GET':
          const resGet = await request.get(url)
          return resGet
        default:
          throw new Error(`The requested method is not supported: ${method}`)
      }
    } catch (inner) {
      const err = new Error('GP API proxy call failed.')
      err.inner = inner
      winston.error(util.inspect(err))
      throw err
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
  const { app, apiUrl } = opts
  var url = `${apiUrl}/security/validate/user`
  const payload = { ApplicationToken: app.get('application-token'), UserToken: app.get('user-token') }
  try {
    await request.post(url, payload)
  } catch (err) {
    if (err.Name === 'NoUserForToken') {
      try {
        await resetUserToken(opts)
      } catch (err) {
        if (err.Name === 'NoApplicationForToken') {
          await setTokens(opts)
        } else {
          throw err
        }
      }
    } else {
      throw err
    }
  }
}

const setTokens = async opts => {
  const health = await apiCheck()
  const applicationToken = await setApplicationToken(opts)
  const userToken = await setUserToken(opts)
  winston.info(`GP API
      - api-url     : ${health.url}
      - api-ping    : ${health.ping}
      - db-check    : ${health.db}
      - app-token   : ${applicationToken}
      - user-token  : ${userToken}`)
}

const setApplicationToken = async ({ app, apiUrl, keyPublic, keyPrivate }) => {
  const { IV, Token } = await request.get(`${apiUrl}/security/encryptedToken/application/${keyPublic}`)
  const secret = new Buffer(keyPrivate, 'utf-8')
  const vector = new Buffer(IV, 'base64')
  const encrypted = new Buffer(Token, 'base64')
  const decipher = crypto.createDecipheriv('des3', secret, vector)
  let decrypted = decipher.update(encrypted, 'binary', 'ascii')
  decrypted += decipher.final('ascii')
  const application = await request.get(`${apiUrl}/security/login/application/${keyPublic}/${decrypted}`)
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
  winston.info(`GP API - reset user-token = ${token}`)
}

var apiCheck = undefined
const attachCheck = async ({ apiUrl }) => {
  apiCheck = async () => {
    return {
      url: apiUrl,
      ping: await request.get(`${apiUrl}/`, 3000),
      db: await request.get(`${apiUrl}/db-check`, 10000)
    }
  }
}

const check = async () => {
  return await apiCheck()
}

var apiGetProfileFromToken = undefined
const attachGetProfileFromToken = async ({ apiUrl }) => {
  apiGetProfileFromToken = async (app, userToken) => {
    const user = await request.get(`${apiUrl}/security/login/user/token/${userToken}`)
    const profile = { nameId: user.Id, firstname: user.FirstName, lastname: user.LastName, email: user.Email, token: userToken }
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

const get = async (path, timeout) => {
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  var gpapiProxy = getGpapiProxy()
  return gpapiProxy({ path, method: 'GET' })
}

const post = async (path, payload, timeout) => {
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  var gpapiProxy = getGpapiProxy()
  return gpapiProxy({ path, method: 'POST', body: payload })
}

export default { handshake, requiresHandshake, get, post, check, getProfileFromToken }
