import http from 'http';
import { URL } from 'url';


type HTTPSwitchPattern =
	{
		pathname?: string | RegExp,
		path?: string | RegExp,
		hostname?: string | RegExp,
		host?: string | RegExp,
		port?: string | RegExp,
		remoteAddress?: string | RegExp,
		remotePort?: number | RegExp,
		localAddress?: string | RegExp,
		localPort?: number | RegExp,
		method?: string | RegExp,
		httpVersion?: string | RegExp;
	};
type HTTPSwitchHandleFunction = (request: http.IncomingMessage, response: http.ServerResponse) => void | Promise<any>;
type HTTPSwitchHandler =
	{
		pattern: HTTPSwitchPattern,
		handle: HTTPSwitchHandleFunction;
	};

type HTTPSwitchAnyServer =
	{
		on: (event: string, handler: (request: http.IncomingMessage, response: http.ServerResponse) => void) => void;
	};
type HTTPSwitchOptions =
	{
		server?: HTTPSwitchAnyServer,
		handlers?: HTTPSwitchHandler[],
		trimTrailingSlash?: boolean;
	};


class HTTPSwitch
{
	server?: HTTPSwitchAnyServer;
	handlers: HTTPSwitchHandler[];
	trimTrailingSlash: boolean;

	constructor(options?: HTTPSwitchOptions | HTTPSwitchAnyServer)
	{
		if(options && typeof (options) === 'object' && 'on' in options && typeof (options.on) === 'function')
		{
			this.server = options;
			this.handlers = [];
			this.trimTrailingSlash = false;
		}
		else if(options && typeof (options) === 'object')
		{
			options = options as HTTPSwitchOptions;
			this.server = options.server;
			this.handlers = options.handlers || [];
			this.trimTrailingSlash = options.trimTrailingSlash || false;
		}
		else
		{
			this.handlers = [];
			this.trimTrailingSlash = false;
		}


		this.init();
	}

	init(): void
	{
		if(this.server && this.server.on)
			this.server.on('request', this.switchRequest.bind(this));
	}

	for(pattern: HTTPSwitchPattern | string | RegExp, handler: HTTPSwitchHandleFunction | { handle: HTTPSwitchHandleFunction; }): this
	{
		return this.addHandler(pattern, handler);
	}
	addHandler(pattern: HTTPSwitchPattern | string | RegExp, handler: HTTPSwitchHandleFunction | { handle: HTTPSwitchHandleFunction; }): this
	{
		if(typeof (pattern) === 'string' || pattern instanceof RegExp)
			pattern = { pathname: pattern };

		let handleFunction: HTTPSwitchHandleFunction;
		switch(typeof (handler))
		{
			case 'function':
				handleFunction = handler;
				break;

			case 'object':
				if(!handler || ('handle' in handler && typeof (handler.handle) !== 'function'))
					throw new Error('handler must have a function called \'handle\'');

				handleFunction = ((handler) => (request: http.IncomingMessage, response: http.ServerResponse) =>
				{
					if(typeof (handler.handle) !== 'function')
						throw new Error('handler doesn\'t contain a \'handle\' function');

					return handler.handle(request, response);
				})(handler);
				break;

			default:
				throw new Error('handler must be function or object');
		}

		this.handlers.push({ pattern: pattern, handle: handleFunction });

		return this;
	}

	async switchRequest(request: http.IncomingMessage, response: http.ServerResponse, { handleErrors = true }: { handleErrors?: boolean; } = {}): Promise<void>
	{
		try
		{
			if(!this.handlers || !this.handlers.length)
				throw new Error('No handler matched');

			let handler = this.findHandler(request);
			if(!handler)
				throw new Error('No handler matched');

			await handler.handle(request, response);
		}
		catch(x)
		{
			if(handleErrors)
			{
				console.error(x);
				try
				{
					response.writeHead(500);
					response.end();
				}
				catch
				{ }
			}
			else
			{
				throw x;
			}
		}
	}
	findHandler(request: http.IncomingMessage | string): HTTPSwitchHandler | undefined
	{
		let requestURL: URL;
		let requestObj: http.IncomingMessage | undefined;
		if(typeof (request) === 'string')
		{
			requestURL = new URL(request);
			requestObj = undefined;
		}
		else
		{
			requestObj = request;
			requestURL = new URL(requestObj.url ?? '', 'a://b');
		}

		let requestPathname = requestURL.pathname;
		if(this.trimTrailingSlash && requestPathname.length > 1)
			requestPathname = requestPathname.replace(/\/$/, '');


		return this.handlers.find((handler) =>
		{
			let pattern = handler.pattern;
			return matchesPattern(pattern.pathname ?? pattern.path, requestPathname)
				&& matchesPattern(pattern.hostname ?? pattern.host, requestObj?.headers?.host)
				&& matchesPattern(pattern.port, requestObj?.socket?.localPort)
				&& matchesPattern(pattern.remoteAddress, requestObj?.socket?.remoteAddress)
				&& matchesPattern(pattern.remotePort, requestObj?.socket?.remotePort)
				&& matchesPattern(pattern.localAddress, requestObj?.socket?.localAddress)
				&& matchesPattern(pattern.localPort, requestObj?.socket?.localPort)
				&& matchesPattern(pattern.method, requestObj?.method)
				&& matchesPattern(pattern.httpVersion, requestObj?.httpVersion);
		});
	}
}

function matchesPattern(pattern: string | number | RegExp | undefined, value: string | number | undefined): boolean
{
	if(pattern === undefined || pattern === null)
		return true;
	if(value === undefined || value === null)
		return value === pattern;

	if(pattern instanceof RegExp)
		return pattern.test(value?.toString());

	return value === pattern;
}


export { HTTPSwitch };
export default HTTPSwitch;
