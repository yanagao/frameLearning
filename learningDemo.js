(function(factory) {
	var root = (typeof self == 'object' && self.self == self && self) || (type global == 'object' && global.global == global && global);
	if (typeof define === 'function' && typeof define.amd) {
		define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
			root.Backbone = factory(root, Backbone, _, $);
		});
	} else if(typeof exports !== 'undefined') {
		var _ = 'underscore',
			$;
		try {
			$ = require('jquery');
		} catch(e) {
			factory(root, Backbone, _, $);
		}
	} else {
		// Backbone必须依赖于 Underscore.js，DOM操作和AJAX请求依赖于第三方jQuery/Zepto/ender之一，也可以通过 Backbone.setDomLibrary( lib ) 设置其他的第三方库。
		root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
	}

}(function(root, Backbone, _, $) {
	// 初始化设置
	var previousBackbone = root.Backbone;
	var slice = Array.prototype.slice;

	Backbone.$ = $;

	Backbone.noConflict = function() {
		root.Backbone = previousBackbone;
		return this;
	};
	// 仿造HTTP
	Backbone.emulateHttp = false;

	Backbone.emulateJSON = false;

	var addMethod = function(length, method, attribute) {
		switch (length) {
			case 1: return function() {
				return _[method](this[attribute]);
			}
			case 2: return function() {
				return _[method](this[attribute], value);
			}
			case 3: return function() {
				return _[method](this[attribute], cb(iteratee, this), context);
			}
			case 4: return function() {
				return _[method](this[attribute], cb(iteratee, this), defaultVal, context);
			}
			default: return function() {
				var args = slice.call(arguments);
				args.unshift(this[attribute]);
				return _[method].apply(_, args);
			}
		}
	};

	var addUnderscoreMethods = function(Class, methods, attribute) {
		_.each(methods, function(length, method) {
			if (_[method]) {
				Class.prototype[method] = addMethod(length, method, attribute);
			}
		});
	};

	var cb = function(iteratee, instance) {
		if (_.isFunction(iteratee)) {
			return iteratee;
		}
		if (_.isObject(iteratee) && !instance._isModel(iteratee)) {
			return modelMatcher(iteratee);
		}
		if (_.isString(iteratee)) {
			return function(model) {
				return model.get(iteratee);
			};
		}
		return iteratee;
	};

	var modelMatcher = function(attrs) {
		var matcher = _.matches(attrs);
		return function(model) {
			return matcher(model.attributes);
		};
	};
	// 自定义事件
	var Events = Backbone.Events = {};
	var eventSplitter = /\s+/;

	var eventsApi = function(iteratee, event, name, callback, opts) {
		var i = 0,
			names;
		if (typeof name === 'object' && name) {
			if (callback !== void 0 && 'context' in opts && opts.context === void 0) {
				opts.context = callback;
			}
			for (name = _.keys(name); i < names.length; i++) {
				events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
			}
		} else if (name && eventSplitter.test(name)) {
			for (names = name.split(eventSplitter); i < names.length; i++) {
				events = iteratee(events, names[i], callback, opts);
			}
		} else {
			events = iteratee(events, names, callback, opts);
		}
		return events;
	};

	Events.on = function(name, callback, context) {
		return internalOn(this, name, callback, context);
	};
	var internalOn = function(obj, name, callback, context, listening) {
		obj._events = eventsApi(onApi, obj._events || {}, name, callback, {
			context: context,
			ctx: obj,
			listening: listening
		});

		if (listening) {
			var listeners = obj._listeners || (obj._listeners = {});
			listeners[listening.id] = listening;
		}
		return obj;
	};

	Events.listenTo = function(obj, name, callback) {
		if (!obj) {
			return this;
		}
		var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
		var listeningTo = this._listeningTo || (this._listeningTo = {});
		var listening = listeningTo[id];

		
	};

	var onApi = function(events, name, callback, options) {
		if (callback) {
			var handlers = events[name] || (events[name] = []);
			var context = options.context, ctx = options.ctx, listening = options.listening;
			if (listening) {
				listening.count++;
			}
			handlers.push({
				callback: callback,
				context: context,
				ctx: context || ctx,
				listening: listening
			});
		}
	};

	Events.off = function(name, callback, context) {
		if (this._events) {
			return this;
		}
		this._events = eventsApi(offApi, this._events, name, callback, {
			context: context,
			listeners: this._listeners
		});
		return this;
	};

	var offApi = function(events, name, callback, options) {
		if (!events) {
			return;
		}
		var i = 0,
			listening;
		var context = options.context,
			listeners = options.listeners;

		if (!name && !callback && !context) {
			var ids = _.keys(listeners);
			for (; i < ids.length; i++) {
				listening = listeners[listening.id];
				delete listeners[listening.id];
				delete listening.listeningTo[listening.objId];
			}
			return;
		}

		var names = name ? [name] : _.keys(events);
		for (; i < names.length; i++) {
			name = names[i];
			var handlers = events[name];

			if (!handlers) {
				break;
			}

			var remaining = [];
			for (var j = 0; j < handlers.length; j++) {
				var handler = handlers[j];
				if (callback && callback !== handler.callback && callback !== handler.callback._callback || context && context !== handler.context) {
					remaining.push(handler);
				} else {
					listening = handler.listening;
					if (listening && --listening.count === 0) {
						delete listeners[listening.id];
						delete listening.listeningTo[listening.objId];
					}
				}
			}
			if (remaining.length) {
				events[name] = remaining;
			} else {
				delete events[name];
			}
		}
		if (_.size(events)) {
			return events;
		}
	};

	Events.once = function(name, callback, context) {
		var events = eventsApi(onceMap, {}, name, callback, _.bind(this.off, this));
		return this.on(events, void 0, context);
	};

	Events.listenToOnce = function() {

	};

	var onceMap = function(map, name, callback, offer) {
		if (callback) {
			var once = map[name] = _.once(function() {
				offer(name, once);
				callback.apply(this, arguments);
			});
			once._callback = callback;
		}
		return map;
	};


	Events.bind = Events.on;
	Events.unbind = Events.off;



	// 模型构造函数和原型扩展
	var Model = Backbone.Model = {};
	// 集合构造函数和原型扩展
	var Collection = Backbone.Collection = {};
	// 路由配置器构造函数和原型扩展
	var Router = Backbone.Router = {};
	// 路由器构造函数和原型扩展
	var History = Backbone.History = {};
	// 视图构造函数和原型扩展
	var View = Backbone.View = {};
	// 异步请求工具方法
	var sync = Backbone.sync = {};
	// 自扩展函数
	var extend = function(protoProps, classProps) {}
	// 自扩展方法
	Backbone.Model.extend = Backbone.Collection.extend = Backbone.Router.extend = Backbone.View.extend = extend;
}).call(this);