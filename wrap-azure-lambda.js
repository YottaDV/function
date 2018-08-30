module.exports = function wrapAzureOrLambdaHandler (handler) {
  return function (arg1, arg2, arg3) {
    // Azure! function (context, req)
    if (arg1 && typeof arg1.log === 'function' && typeof arg1.done === 'function') {
      const context = arg1
      const req = arg2

      // Azure log compatibility
      if (!console) {
        global.console = {
          log: (...args) => context.log.info(...args),
          error: (...args) => context.log.info(...args),
          info: (...args) => context.log.info(...args),
          warn: (...args) => context.log.info(...args)
        }
      }

      // Convert Azure req object to have the same key/values as Lambda event object
      // https://serverless.com/framework/docs/providers/azure/events/http/
      Object.assign(req, {
        body: req.rawBody,
        queryStringParameters: req.query,
        pathParameters: req.params,
        httpMethod: req.method
      })
      return handler(req, context, (error, result) => {
        if (error) return context.done(error)
        context.res = {
          body: result.body,
          headers: result.headers,
          status: result.statusCode
        }
        context.done()
      })
    } else {
      return handler(arg1, arg2, arg3)
    }
  }
}
