const test = require('tape')
const proxyquire = require('proxyquire')
const createFn = proxyquire('./', {
  '@ydv/mongo': {
    connect: () => {}
  }
})

test('ok', t => {
  const myCtx = {}
  const fn = createFn((event, context) => {
    t.deepEqual(event.body, {foo: 1})
    t.equal(context, myCtx)
    return { this: 'is so cool' }
  })

  fn({ body: JSON.stringify({ foo: 1 }) }, myCtx, (err, result) => {
    t.notOk(err)
    t.deepEqual(result, {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        this: 'is so cool'
      })
    })
    t.end()
  })
})
