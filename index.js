'use strict';

const url = require('url');

class HTTPSwitch
{
	constructor(options)
	{
		if(typeof (options) === 'object' && typeof (options.on) === 'function')
			options = { server: options };
		else
			options = options || {};

		this.server = options.server;
		this.handlers = options.handlers || [];
		this.trimTrailingSlash = options.trimTrailingSlash || false;

		this.init();
	}

	init()
	{
		if(this.server && this.server.on)
			this.server.on('request', this.switchRequest.bind(this));
	}

	addHandler(pattern, handler)
	{
		pattern = pattern || {};

		if(typeof (pattern) === 'string' || (pattern && pattern instanceof RegExp))
			pattern = { pathname: pattern };

		let handleFunction;
		switch(typeof (handler))
		{
			case 'function':
				handleFunction = handler;
				break;
			case 'object':
				if(!handler || typeof (handler.handle) !== 'function')
					throw new Error('handler must have a function called \'handle\'');
				handleFunction = handler.handle.bind(handler);
				break;
			default:
				throw new Error('handler must be function or object');
		}
		this.handlers.push(
			{
				pattern: pattern,
				handle: handleFunction
			}
		);
		return this;
	}

	async switchRequest(request, response)
	{
		if(!this.handlers || !this.handlers.length)
		{
			endResponse(response, 500, 'No handlers specified');
			return;
		}

		let handler = this.findHandler(request);
		if(!handler)
		{
			endResponse(response, 500, 'No handler matched');
			return;
		}

		try
		{
			return await handler.handle(request, response);
		}
		catch(x)
		{
			console.error(x);
			endResponse(response, 500);
			return;
		}
	}
	findHandler(request)
	{
		let requestURL;
		if(typeof (request) === 'string')
		{
			requestURL = url.parse(request);
			request = {};
		}
		else
		{
			requestURL = url.parse(request.url);
		}


		let urlPathname = requestURL.pathname;
		if(this.trimTrailingSlash && urlPathname.length > 1)
			urlPathname = urlPathname.replace(/\/$/, '');

		return this.handlers.find((handler) =>
		{
			let pattern = handler.pattern;
			return matches(pattern.pathname || pattern.path, urlPathname)
				&& matches(pattern.hostname || pattern.host, request.headers && request.headers.host)
				&& matches(pattern.port, request.socket && request.socket.localPort)
				&& matches(pattern.remoteAddress, request.socket && request.socket.remoteAddress)
				&& matches(pattern.remotePort, request.socket && request.socket.remotePort)
				&& matches(pattern.localAddress, request.socket && request.socket.localAddress)
				&& matches(pattern.localPort, request.socket && request.socket.localPort)
				&& matches(pattern.method, request.method)
				&& matches(pattern.httpVersion, request.httpVersion);
		});
	}
}

HTTPSwitch.prototype.for = HTTPSwitch.prototype.addHandler;

function matches(pattern, value)
{
	if(!pattern)
		return true;

	if(typeof (pattern) === 'string')
		return value === pattern;

	if(pattern instanceof RegExp)
		return pattern.test(value);

	return value === pattern;
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
