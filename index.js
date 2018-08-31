const slsp = require('sls-promise')
const qs = require('qs')
const HttpError = require('node-http-error')
const Logger = require('@ydv/logger')
const wrapAzureOrLambdaHandler = require('./wrap-azure-lambda')

const requireMongo = () => require('@ydv/mongo')

module.exports = createFunction

function createFunction (fn, { json = true, runBefore, noDatabase } = {}) {
  const wrapped = slsp(wrapHandler)

  return wrapAzureOrLambdaHandler(handler)

  function handler (event, context, callback) {
    event.log = Logger(`${event.httpMethod} ${event.resource}`)

    event.log.silly(`Booting up a function at ${event.httpMethod} ${event.resource || event.originalUrl}`, {
      MONGO_URL: process.env.MONGO_URL
    })

    return wrapped(event, context, function (error, result) {
      const code = result && result.statusCode
      if (code < 200 || code >= 400) {
        event.log.silly('error response:', result)
      }
      callback(error, result)
    })
  }

  function wrapHandler (event, context) {
    // https://www.mongodb.com/blog/post/serverless-development-with-nodejs-aws-lambda-mongodb-atlas
    // the following line is critical for performance reasons to allow re-use of database
    // connections across calls to this Lambda function and avoid closing the database connection.
    // The first call to this lambda function takes longer to complete and connect, while subsequent
    // close calls will take no time.
    context.callbackWaitsForEmptyEventLoop = false
    if (!noDatabase) {
      requireMongo().connect()
    }

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
