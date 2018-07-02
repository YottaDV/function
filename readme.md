### @ydv/function

```
npm install --save @ydv/function
```

Creates a wrapper around a Lambda handler.

1. Enables promise support. Return a value from the handler, and it's assumed to be 200 OK JSON.
2. Sane error handling. Any error object will be passed as response body with error.statusCode || 500.
3. Logging on error, adds logger to context
4. Connects to mongo at start of request
5. Automatically parses incoming event.body to object and event.query to object (if applicable)
