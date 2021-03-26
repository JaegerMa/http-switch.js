# http-switch
  Simple switch for http requests

Basically http-switch is another http handler, but it allows you to create your own server and handles only the 'request'-event. This makes it possible to use either `http`, `https`, `spdy` or any other `http`-compatible server.

## Usage

```js
const http = require('http');
const HTTPSwitch = require('http-switch');

let server = http.createServer();
let httpSwitch = new HTTPSwitch(server);

let fooHandler = function(request, response)
{
	/* Do foo */
};


httpSwitch.for('/', (request, response) => //Handles requests matching string '/'
{
	/* Serve index.html */
});

httpSwitch.for(/^\/foo/, (request, response) => //Handles requests matching regex ^/foo
						//which includes every string starting with /foo
						//even '/foo/bar' and '/foobar'
{
	/* Serve foo.html */
});

httpSwitch.for({ hostname: 'example.com' }, fooHandler); //Handles every request for example.com

httpSwitch.for({ hostname: /.+\.example.com/, pathname: /^/ }, fooHandler); //Handles every request for *.example.com

httpSwitch.for({ port: 1337, method: 'DELETE' }, fooHandler); //Handles every DELETE request

httpSwitch.for({ port: 1337, method: 'PUT' }, fooHandler); //Handles every PUT request on port 1337

httpSwitch.for({ method: 'PATCH', pathname: /foobar$/ }, fooHandler); //Handles every PATCH request whose URL ends with foobar

httpSwitch.for({ httpVersion: '1.0' }, fooHandler); //Handles every HTTP 1.0 request

//Handles every POST HTTP 1.1 request on port 4242 for hostname baz.example.com whose URL starts with /foo and ends with bar
httpSwitch.for({ httpVersion: '1.1', method: 'POST', port: 4242, hostname: 'baz.example.com', pathname: /^\/foo.*bar$/ }, fooHandler);

httpSwitch.for(/^/, fooHandler); //Handles every request


server.listen(80);
```

Handlers are processed sequentially, so handler 3 will be called only if handler 1 and 2 don't match

### Examples
- `/`  
Handler 1
- `/foo`  
Handler 2
- `/foo/bar/abc`  
Handler 2
- `/foobar/abc`  
Handler 2
- `/barfoo`  
Handler 3
- `/abc`  
Handler 3

### Exceptions

If the handler-function returns a Promise, HTTP-Switch will catch exceptions in that Promise and end the connection.

```js

httpHandler.for(/^\/foo/, async (request, response) =>
{
	let foo = await something();

	throw new Error();
	//Response will be closed with http code 500
}
```

## API

### `new HTTPSwitch()`

As no server is given, you have to pass requests manually via the switchRequest-method

#### returns

- `HTTPSwitch: object`

### `new HTTPSwitch(server)`

#### arguments

- `server: object`  
Any object compatible to http.Server  

#### returns

- `HTTPSwitch: object`

### `new HTTPSwitch(options)`

#### arguments

- `options: object`
  - [`server: object`]  
  Any object compatible to http.Server  
  If ommited, you have to pass requests manually via the switchRequest-method
  - [`handlers: array`]  
  HTTPSwitch handlers. Must be in internal http-switch format
  - [`trimTrailingSlash: bool`]  
  Trim trailing slash before matching handlers. URL in request isn't modified. Root slash isn't trimmed.

#### returns

- `HTTPSwitch: object`

### `HTTPSwitch.for(pathname, onRequest)`

#### arguments

- `pathname: string or RegExp`
- `onRequest: function(request, response)`

#### returns

- `this`

### `HTTPSwitch.for(path, onRequest)`

#### arguments

- `path: object`
	- `pathname | path: string or RegExp`
	- `hostname | host: string or RegExp`
	- `port: int`
	- `localAddress: string or RegExp`
	- `localPort: int`
	- `remoteAddress: string or RegExp`
	- `remotePort: int`
	- `method: string or RegExp`
	- `httpVersion: string or RegExp`
- `onRequest: function(request, response)`

#### returns

- `this`

### `HTTPSwitch.addHandler(pathname, onRequest)`
Same as `HTTPSwitch.for`

### `HTTPSwitch.addHandler(path, onRequest)`
Same as `HTTPSwitch.for`

### `HTTPSwitch.switchRequest(request, response, { handleErrors = true } = {})`

#### arguments

- `request: http.IncommingMessage`
- `response: http.ServerResponse`
- `handleErrorrs: bool`
