'use strict';

const url = require('url');

class HTTPSwitch
{
	constructor(server)
	{
		this.server = server;
		this.handlers = [];

		this.init();
	}

	init()
	{
		if(this.server && this.server.on)
			this.server.on('request', this.switchRequest.bind(this));
	}

	addHandler(path, handler)
	{
		if(typeof(path) === 'string' || (path && path instanceof RegExp))
			path = { pathname: path };

		let handleFunction;
		switch(typeof(handler))
		{
			case 'function':
				handleFunction = handler;
				break;
			case 'object':
				if(!handler || typeof(handler.handle) !== 'function')
					throw new Error('handler must have a function called \'handle\'');
				handleFunction = handler.handle.bind(handler);
				break;
			default:
				throw new Error('handler must be function or object');
		}
		this.handlers.push(
			{
				path,
				handle: handleFunction
			}
		);
		return this;
	}

	switchRequest(request, response)
	{
		let requestURL = url.parse(request.url);

		if(!this.handlers || !this.handlers.length)
		{
			endResponse(response, 500, 'No handlers specified');
			return;
		}

		let handler = this.findHandler(requestURL);
		if(handler)
		{
			let promise = handler.handle(request, response);
			if(promise && promise instanceof Promise)
			{
				promise.catch((x) =>
				{
					console.error(x);
					endResponse(response, 500);
				});
			}
		}
		else
		{
			endResponse(response, 500, 'No handler matched');
		}
		return handler;
	}
	findHandler(requestURL)
	{
		return this.handlers.find((handler) =>
					matches(handler.pathname || handler.path, requestURL.pathname)
				&&	matches(handler.hostname || handler.host, requestURL.hostname)
				&&	matches(handler.port, requestURL.port)
			);
	}
}

HTTPSwitch.prototype.for = HTTPSwitch.prototype.addHandler;

function matches(pattern, value)
{
	if(!pattern)
		return true;

	if(typeof(pattern) === 'string')
		return value === pattern;
	
	if(pattern instanceof RegExp)
		return pattern.test(value);

	return false;
}
function endResponse(response, statusCode, message)
{
	response.statusCode = statusCode;
	try
	{
		response.end(message);
	}
	catch(x)
	{ }
}

if(module && module.exports)
module.exports = HTTPSwitch;
