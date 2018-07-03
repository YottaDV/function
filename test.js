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

test('advanced error', t => {
  const ErrorCtor = () => {
    const err = new Error()
    err.code = 'MY_CODE'
    err.message = 'My Message'
    err.statusCode = 401
    return err
  }
  const fn = createFn((event, context) => {
    throw ErrorCtor()
  })
  fn({}, {}, (err, result) => {
    t.notOk(err)
    console.log(result)
  })
})
