const slsp = require('sls-promise')
const qs = require('qs')
const HttpError = require('node-http-error')
const Logger = require('@ydv/logger')
const wrapAzureOrLambdaHandler = require('./wrap-azure-lambda')

module.exports = createFunction

function createFunction (fn, { json = true, runBefore } = {}) {
  const wrapped = slsp(wrapHandler)

  return wrapAzureOrLambdaHandler(handler)

  function handler (event, context, callback) {
    event.log = Logger(`${event.httpMethod} ${event.resource}`)

    event.log.silly(`Booting up a function at ${event.httpMethod} ${event.resource || event.originalUrl}`)

    return wrapped(event, context, function (error, result) {
      const code = result && result.statusCode
      if (code < 200 || code >= 400) {
        event.log.silly('error response:', result)
      }
      callback(error, result)
    })
  }

  function wrapHandler (event, context) {
    if (json && event.body) {
      try {
        event.body = JSON.parse(event.body)
      } catch (e) {
        throw HttpError(415, 'Expected valid JSON request body.')
      }
    }
    event.queryStringParameters = qs.parse(event.queryStringParameters || {})
    event.pathParameters = event.pathParameters || {}

    return Promise.resolve()
      .then(
        typeof runBefore === 'function'
          ? () => runBefore(event, context)
          : null
      )
      .then(() => fn(event, context))
      .catch(handleError)

    function handleError (error) {
      error.statusCode = error.status || error.statusCode || 500
      event.log.silly(error.stack)
      return Promise.reject(slsp.response({
        statusCode: error.statusCode,
        body: { code: error.code, message: error.message }
      }))
    }
  }
}
