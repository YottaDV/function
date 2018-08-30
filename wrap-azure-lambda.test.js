const test = require('tape')
const slsp = require('sls-promise')
const wrap = require('./wrap-azure-lambda')

test('wrapAzureOrLambdaHandler: azure', (t) => {
  const context = {
    log: {
      info: (...args) => console.log(...args)
    },
    done: () => {}
  }

  const req = {
    rawBody: JSON.stringify({ hello: 'world' }),
    query: { foo: '1' },
    params: { bar: '2' },
    method: 'put'
  }

  const handler = slsp((event) => {
    t.deepEqual(event.body, JSON.stringify({ hello: 'world' }))
    t.deepEqual(event.queryStringParameters, { foo: '1' })
    t.deepEqual(event.pathParameters, { bar: '2' })
    t.deepEqual(event.httpMethod, 'put')
    return { goodbye: 'world', fooIs: 1, barIs: 2 }
  })

  const fn = wrap(handler)
  fn(context, req).then(() => {
    t.deepEqual(context.res, {
      status: 200,
      body: JSON.stringify({ goodbye: 'world', fooIs: 1, barIs: 2 }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    t.end()
  })
})
