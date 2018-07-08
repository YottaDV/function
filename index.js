const slsp = require('sls-promise')
const qs = require('querystring')
const HttpError = require('node-http-error')
const Logger = require('@ydv/logger')
const { connect: dbConnect } = require('@ydv/mongo')

module.exports = createFunction

function createFunction (fn, { json = true, runBefore, runAfter } = {}) {
  const wrapped = slsp(wrapHandler)
  return function handler (event, context, callback) {
    context.log = Logger(`${event.httpMethod} ${event.resource}`)

    return wrapped(event, context, function (error, result) {
      const code = result && result.statusCode
      if (code < 200 || code >= 400) {
        context.log.silly('error response:', result)
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
    dbConnect()

    return Promise.resolve()
      .then(!runBefore ? null : () => runBefore(event, context))
      .then(runHandler)
      .then(!runAfter ? null : (result) => runAfter(event, context, result))
      .catch(handleError)

    function runHandler () {
      if (json && event.body) {
        try {
          event.body = JSON.parse(event.body)
        } catch (e) {
          throw HttpError(415, 'Expected valid JSON request body.')
        }
      }
      if (typeof event.query === 'string') {
        event.query = qs.parse(event.query)
      }

      return fn(event, context)
    }

    function handleError (error) {
      error.statusCode = error.status || error.statusCode || 500
      context.log.silly(error.stack)
      return Promise.reject(slsp.response({
        statusCode: error.statusCode,
        body: { code: error.code, message: error.message }
      }))
    }
  }
}
