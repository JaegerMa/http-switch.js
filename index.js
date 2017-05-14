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
		this.server.on('request', this.switchRequest.bind(this));
	}

	addHandler(path, handler)
	{
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
				isRegex: path instanceof RegExp,
				handle: handleFunction
			}
		);
		return this;
	}

	switchRequest(request, response)
	{
		var pathname = url.parse(request.url).pathname;

		if(!this.handlers || !this.handlers.length)
		{
			endResponse(response, 500, 'No handlers specified');
			return;
		}

		let handler = this.findHandler(pathname)
		if(handler)
		{
			handler.handle(request, response).catch((x) =>
			{
				console.error(x);
				endResponse(response, 500);
			});
		}
		else
		{
			endResponse(response, 500, 'No handler matched');
		}
		return handler;
	}
	findHandler(pathname)
	{
		return this.handlers.find((handler) =>
				pathname == handler.path
			|| 	(
					handler.isRegex
				&& 	handler.path.test(pathname)
				)
			);
	}
}

HTTPSwitch.prototype.for = HTTPSwitch.addHandler;

function endResponse(response, statusCode, message)
{
	response.statusCode = statusCode;
	response.end(message);
}

if(module && module.exports)
module.exports = HTTPSwitch;
