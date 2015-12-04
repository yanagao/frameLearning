(function(factory) {
	var root = (typeof self == 'object' && self.self == self && self) || (type global == 'object' && global.global == global && global);
	// define与exports是两个依赖的库，define优先级高于exports
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
		// Backbone必须依赖于 Underscore.js，DOM操作和AJAX请求依赖于第三方jQuery/Zepto/ender之一。
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
	// 跟踪监听
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

	// 绑定事件
	Events.on = function(name, callback, context) {
		alert('events.on');
		return internalOn(this, name, callback, context);
	};
	// 执行事件
	Events.trigger = function(name) {
		if (!this._events) {
			return this;
		}
		var length = Math.max(0, arguments.length - 1);
		var args = Array(length);
		for (var i = 0; i < length; i++) {
			args[i] = arguments[i + 1];
		}
		eventsApi(triggerApi, this._events, name, void 0, args);
		return this;
	};
	var triggerApi = function(objEvents, name, cb, args) {
		if (objEvents) {
			var events = objEvents[name];
			var allEvents = objEvents.all;
			if (events && allEvents) {
				allEvents = allEvents.slice(); // ?????
			}
			// if (events) {
			// 	triggerEvents(events, args);
			// }
			// if (allEvents) {
			// 	triggerEvents(allEvents, [name].concat(args));
			// }
		}
		return objEvents;
	};
	// 触发事件优化？
	// var triggerEvents = function(events, args) {
	// 	var ev,
	// 		i = -1,
	// 		l = events.length,
	// 		a1 = args[0],
	// 		a2 = args[1],
	// 		a3 = args[2];
	// 	switch (args.length) {
	// 		case 0: while (++i < l) {

	// 		}
	// 	}
	// };


	Events.listenTo = function(obj, name, callback) {
		if (!obj) {
			return this;
		}
		var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
		var listeningTo = this._listeningTo || (this._listeningTo = {});
		var listening = listeningTo[id];

		if (!listening) {
			var thisId = this._listenId || (this._listenId = _.uniqueId('l'));
			listening = listeningTo[id] = {
				obj: obj,
				objId: id,
				id: thisId,
				listeningTo: listeningTo,
				count: 0
			};
		}
		internalOn(obj, name, callback, this, listening);
		return this;
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

	Events.listenToOnce = function(obj, name, callback) {
		var events = eventsApi(onceMap, {}, name, callback, _.bind(this.off, this));
		return this.listenTo(obj, events);
	};

	Events.stopListening = function(obj, name, callback) {
		var listeningTo = this._listeningTo;
		if (!listeningTo) {
			return this;
		}
		var ids = obj ? [obj._listenId] : _.keys(listeningTo);

		for (var i = 0; i < ids.length; i++) {
			var listening = listeningTo[ids[i]];

			if (!listening) {
				break;
			}
			listening.obj.off(name, callback, this);
		}
		if (_.isEmpty(listeningTo)) {
			this._listeningTo = void 0;
		}
		return this;
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

	_.extend(Backbone, Events);



	// 模型构造函数和原型扩展
	var Model = Backbone.Model = function(attributes, options) {
		var attrs = attributes || {};
		options || (options = {});
		this.cid = _.uniqueId(this.cidPrefix);
		this.attributes = {};
		if (options.collection) {
			this.collection = options.collection;
		}
		if (options.parse) {
			attrs = this.parse(attrs, options) || {};
		}
		attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
		this.set(attrs, options);
		this.change = {};
		this.initialize.apply(this, arguments);
	};

	// 模型的原型
	_.extend(Model.prototype, Events, {
		changed: null,
		validationError: null,
		idAttribute: 'id',
		cidPrefix: 'c',
		// 初始化为空
		initialize: function() {},

		sync: function() {
			return this.attributes[attr];
		},

		// 获取属性的值
		get: function(attr) {
			return this.attributes[attr];
		},

		// 
		escape: function(attr) {
			return _.escape(this.get(attr));
		},

		// 非空值时返回true
		has: function(attr) {
			return this.get(attr) != null;
		},

		matches: function(attr) {
			return !!_.iteratee(attrs, this)(this.attributes);
		},

		set: function(key, val, options) {
			if (key == null) {
				return this;
			}
			var attrs;
			if (typeof key === 'object') {
				attrs = key;
				options = val;
			} else {
				(attrs = {})[key] = val;
			}

			options || (options = {});

			// 验证
			if (!this._validate(attrs, options)) {
				return false;
			}
			// 
			var unset = options.unset;
			var silent = options.silent;
			var change = [];
			var changing = this._changing;
			this._changing = true;

			if (!changing) {
				this._previousAttributes = _.clone(this.attributes);
				this.changed = {};
			}
			var current = this.attributes;
			var changed = this.changed;
			var prev = this._previousAttributes;

			for (var attr in attrs) {
				val = attrs[attr];
				if (!_.isEqual(current[attr], val)) {
					changes.push(attr);
				}
				if (!_.isEqual(prev[attr], val)) {
					changed[attr] = val;
				} else {
					delete changed[attr];
				}
				unset ? delete current[attr] : current[attr] = val;
			}
			// 获取id
			this.id = this.get(this.idAttribute);

			if (!silent) {
				if (changes.length) {
					this._pending = options;
				}
				for (var i = 0; i < changes.length; i++) {
					this.trigger('change:' + changes[i], this, current[changes[i]], options);
				}
			}

			if (changing) {
				return this;
			}
			if (!silent) {
				while (this._pending) {
					options = this._pending;
					this._pending = false;
					this.trigger('change', this, options);
				}
			}
			this._pending = false;
			this._changing = false;
			return this;
		},
		// 如果属性不存在则删除
		unset: function(attr, options) {
			return this.set(attr, void 0, _.extend({}, options, {unset: true}));
		},
		clear: function(options) {
			var attrs = {};
			for (var key in this.attributes) {
				attrs[key] = void 0;
			}
			return this.set(key, _.extend({}, options, {unset: true}));
		},
		hasChanged: function(attr) {
			if (attr == null) {
				return !_.isEmpty(this.changed);
			}
			return _.has(this.changed, attr);
		},
		clone: function() {
			return new this.constructor(this.attributes);
		},
		changedAttributes: function(diff) {
			if (!diff) {
				return this.hasChanged() ? _.clone(this.changed) : false;
			}
			var old = this.changing ? this.previousAttributes : this.attributes;
			var changed = {};
			for (var attr in diff) {
				var val = diff[attr];
				if (_.isEqual(old[attr], val)) {
					continue;
				}
				changed[attr] = val;
			}
			return _.size(changed) ? changed : false;
		},
		previous: function(attr) {
			if (attr == null || !this.previousAttributes) {
				return null;
			}
			return this._previousAttributes[attr];
		},
		previousAttributes: function() {
			return _.clone(this._previousAttributes);
		},
		parse: function(resp, options) {
			return resp;
		},
		fetch: function(options) {
			options = _.extand({parse: true}, options);
			var model = this;
			var success = options.success;
			options.success = function(resp) {
				var serverAttrs = options.parse ? model.parse(resp, options) : resp;
				if (!model.set(serverAttrs, options)) {
					return false;
				}
				if (success) {
					success.call(options.context, model, resp, options);
				}
				model.trigger('sync', model, resp, options);
			};
			wrapError(this, options);
			return this.sync('read', this, options);
		},
		save: function(key, val, options) {
			var attrs;
			if (key == null || typeof key === 'object') {
				attrs = key;
				options = val;
			} else {
				(attrs = {})[key] = val;
			}

			options = _.extend({validate: true, parse: true}, options);
			var wait = options.wait;

			if (attrs && !wait) {
				if (!this.set(attrs, options)) {
					return false;
				}
			} else {
				if (!this._validate(attrs, options)) {
					return false;
				}
			}

			var model = this;
			var success = options.success;
			var attributes = this.attributes;
			options.success = function(resp) {
				model.attributes = attributes;
				var serverAttrs = options.parse ? model.parse(resp, options) : resp;
				if (wait) {
					serverAttrs = _.extend({}, attrs, serverAttrs);
				}
				if (serverAttrs && !model.set(serverAttrs, options)) {
					return false;
				}
				if (success) {
					success.call(options.context, model, resp, options);
				}
				model.trigger('sync', model, resp, options);
			};
			wrapError(this, options);
			if (attrs && wait) {
				this.attributes = _.extend({}, attributes, attrs);
			}
			var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
			if (method === 'patch' && !options.attrs) {
				options.attrs = attrs;
			}
			var xhr = this.sync(method, this, options);

			this.attributes = attributes;
			return xhr;
		},
		destroy: function(options) {
			options = options ? _.clone(options) : {};
			var model = this;
			var success = options.success;
			var wait = options.wait;

			var destroy = function() {
				model.stopListening();
				model.trigger('destroy', model, model.collection, options);
			};

			options.success = function(resp) {
				if (wait) {
					destroy();
				}
				if (success) {
					success.call(options.context, model, resp, options);
				}
				if (!model.isNew()) {
					model.trigger('sync', model, resp, options);
				}
			};

			var xhr = false;
			if (this.isNew()) {
				_.defer(options.success);
			} else {
				wrapError(this, options);
				xhr = this.sync('delete', this, options);
			}
			if (!wait) {
				destroy();
			}
			return xhr;
		},
		url: function() {
			var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
			if (this.isNew()) {
				return base;
			}
			var id = this.get(this.idAttribute);
			return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id);
		},
		isNew: function() {
			return !this.has(this.attributes);
		},
		isValid: function(options) {
			return this._validate({}, _.defaults({validate: true}, options));
		},
		_validate: function(attrs, options) {
			if (!options.validate || !this.validate) {
				return true;
			}
			attrs = _.extend({}, this.attributes, attrs);
			var error = this.validationError = this.validate(attrs, options) || null;
			if (!error) {
				return true;
			}
			this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
			return false;
		}

	});

	var modelMethods = {
		keys: 1,
		values: 1,
		pairs: 1,
		invert: 1,
		pick: 0,
		omit: 0,
		chain: 1,
		isEmpty: 1
	};
	addUnderscoreMethods(Model, modelMethods, 'attributes');


	// 集合构造函数和原型扩展
	var Collection = Backbone.Collection = function(models, options) {
		options || (options = {});
		if (options.model) {
			this.model = options.model;
		}
	};
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

	return Backbone;
}));