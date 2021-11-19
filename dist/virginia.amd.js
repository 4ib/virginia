(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD.
		define(['jquery', 'underscore', 'backbone', 'handlebars'], factory);
	} else {
		// Browser globals
		root.Virginia = factory(root.$, root._, root.Backbone, root.Handlebars);
	}
}(this, function ($, _, Backbone, Handlebars) {
/**
 * @license almond 0.3.3 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots

            name = name.join('/');
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    //Creates a parts array for a relName where first part is plugin ID,
    //second part is resource ID. Assumes relName has already been normalized.
    function makeRelParts(relName) {
        return relName ? splitPrefix(relName) : [];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relParts) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0],
            relResourceName = relParts[1];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relResourceName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relResourceName));
            } else {
                name = normalize(name, relResourceName);
            }
        } else {
            name = normalize(name, relResourceName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i, relParts,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;
        relParts = makeRelParts(relName);

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relParts);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, makeRelParts(callback)).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../node_modules/almond/almond", function(){});

define( 'virginia/common',[],function(){

	var Common = {

		escape_html: function(unsafe) {
			if (!unsafe){
				return unsafe;
			}

			return unsafe.replace(/[&<"']/g, function(m) {
				switch (m) {
					case '&':
						return '&amp;';
					case '<':
						return '&lt;';
					case '"':
						return '&quot;';
					default:
						return '&#039;';
				}
			});
		},

		break_lines: function(s) {
			if (s) {
				return s.replace(/(?:\r\n|\r|\n)/g, '<br />')
			}
			return s;
		},

		format_money: function(number, options) {
			var result;

			if(options.decimals && typeof options.decimals === 'string') {
				options.decimals = parseInt(options.decimals);
			}

			if(options.multiplier && options.multiplier.length) {
				number = number * parseFloat(options.multiplier);
			}

			if(options.rate && options.rate.length) {
				number = parseFloat( number / parseFloat(options.rate) ).toFixed(options.decimals);
			}

			result = Math.abs(number).toFixed(options.decimals);

			if(options.trim_zero_cents && options.trim_zero_cents !== 'false') {
				result = parseFloat(result).toString();
			}

			if(options.thousands_separator) {
				result = result.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + options.thousands_separator);
			}

			if (result.indexOf('.') >= 0 && result.indexOf(',') > result.indexOf('.')) {
				result = result.replace(/,/g, '');
			}

			if(options.currency) {
				if(options.currency_position === 'left') {
					result = options.currency + result;
				} else {
					result = result + '\xa0' + options.currency;
				}
			}

			if(number < 0) {
				result = '-' + result;
			}
			return result;
		},

		money: function(number, options) {
			var result;
			var exchange;
			var opts_default = {
				currency: '$',
				currency_position: 'left',
				thousands_separator: ',',
				multiplier: '',
				rate: '',
				decimals: 3
			}
			var opts = options;

			if( window.SiteSettings && window.SiteSettings.Currency ) {
				opts_default = window.SiteSettings.Currency;
			}

			_.each(_.keys(opts_default), function( key ) {
				if( _.isNull(opts[key]) || _.isUndefined(opts[key]) ) {
					opts[key] = opts_default[key];
				}
			} );

			result = this.format_money(number, opts);

			if( window.SiteSettings && window.SiteSettings.CurrencyExchange ) {
				exchange = this.format_money(number, window.SiteSettings.CurrencyExchange);
				result += '\xa0\/ ' + exchange;
			}

			return result;
		},

		is_bad_request: function(xhr){
			return (xhr && xhr.status === 400) && ( (xhr.responseJSON && xhr.responseJSON.Type === 'BadRequestException') || (xhr.responseJSON.data && xhr.responseJSON.data.Type === 'BadRequestException') );
		},

		get_bad_request_error_message: function(xhr){
			try {
				if (xhr && xhr.status === 400){
					return xhr.responseJSON.Message || xhr.responseJSON.data.Message;
				}
			} catch(e){
				console.warn('Could not get "Bad Request" error message', e);
			}

			return null;
		}

	};

	return Common;

});
define('virginia/templates',[
	'jquery',
	'handlebars',
	'virginia/common'
], function(jQuery, Handlebars, Common){

	var Templates = {

		_html_cache: {},
		_templates_cache: {},

		_global_context: {},

		/**
		 * Finds template in cache or load them (and save in cache)
		 * @param template_url
		 * @returns {Promise} promise with template function
		 */
		get: function (template_url) {
			var normalized_url = this._normalize_template_url(template_url);
			if ( window.JST && window.JST.hasOwnProperty(normalized_url) ) {
				var t = window.JST[normalized_url];
				var d2 = jQuery.Deferred();
				setTimeout(
					function () {
						d2.resolve(t);
					},
					1
				);
				return d2.promise();
			} else {
				if (Templates._templates_cache.hasOwnProperty(template_url)) {
					var t = Templates._templates_cache[template_url];
					var html = Templates._html_cache[template_url];
					//console.log('Template ' + template_url + ' found in cache.');
					var d1 = jQuery.Deferred();
					setTimeout(
						function () {
							d1.resolve(t, html);
						},
						1
					);
					return d1.promise();
				} else {
					var d = jQuery.Deferred(function (defer) {
						//console.log('Template ' + template_url + ' loading...');
						jQuery.get(template_url)
							.done(function (response) {
								Templates.process_tags(response)
									.done(function (processed_response) {
										var t = Handlebars.compile(processed_response);
										Templates._html_cache[template_url] = processed_response;
										Templates._templates_cache[template_url] = t;
										//console.log('Template ' + template_url + ' loaded.');
										defer.resolve(t, processed_response);
									});
							})
							.fail(function () {
								//console.error('Could not load template ' + template_url);
								//defer.reject();
								throw new Error('Could not load template ' + template_url);
							});
					});
					return d.promise();
				}
			}
		},

		/**
		 * Preload templates
		 * @arguments list of template urls for preloading
		 */
		preload: function () {
			var promises = [];
			if (arguments.length > 0) {
				for (var i = 0; i < arguments.length; i++) {
					var template_name = arguments[i];
					promises.push(Templates.get(template_name));
				}
			}

			// wait for all promises
			return jQuery.when.apply(jQuery, promises);
		},

		/**
		 * Merge global and passed context and render it with template
		 * @param template {function} Template function
		 * @param context {Object} Template context
		 * @returns {String} result of template processing
		 */
		render: function (template, context) {
			// merge local & global contexts and render template
			var cntx = jQuery.extend(
				{},
				Templates._global_context,
				context
			);

			return template(cntx);
		},

		/**
		 * Merges context in global context
		 * @param {Object} context
		 */
		add_to_global_context: function (context) {
			Templates._global_context = jQuery.extend(
				Templates._global_context,
				context
			);
		},

		_re_include: /\{\{include\s+'([^']+)'\s*\}\}/i,
		/**
		 * Load & insert {{includes .. }} tags content
		 * @param html
		 */
		process_tags: function (html) {
			var re_result = Templates._re_include.exec(html);
			if (re_result) {
				var include_tag = re_result[0];
				var template_path = re_result[1].replace(/\\/g, '/');
				var template_url = Templates._template_url(template_path);
				// TODO: search template in _html_cache
				var d = jQuery.Deferred(function (defer) {
					Templates
						.get(template_url)
						.done(function (tmpl, include_html) {
							html = html.replace(include_tag, include_html);
							Templates.process_tags(html).done(function (s) {
								d.resolve(s);
							});
						});
				});
				return d.promise();

			} else {
				return jQuery.Deferred().resolve(html).promise();
			}
		},

		_template_url: function (template_path) {
			return template_path;
		},

		/**
		 * Replace get template api with regular path
		 * api url: '/my/api/2/templates?name='
		 */
		_normalize_template_url: function( template_url ) {
			var api_url = '/my/api/2/templates?name=';
			if( template_url.indexOf( api_url ) >= 0 ) {
				return template_url.replace( api_url, 'templates/' );
			} else {
				return template_url;
			}
		},

		helpers: {

			raw: function(text){
				return new Handlebars.SafeString(text);
			},

			escape: function(text){
				// handlebars escapes by default ?
				return encodeURI(text);
			},

			unescape: function(text){
				return decodeURI(text);
			},

			eq: function(a, b, options){
				if( a == b )
					return options.fn(this);
				else
					return options.inverse(this);
			},

			noeq: function(a, b, options){
				if( a != b )
					return options.fn(this);
				else
					return options.inverse(this);
			},

			break_lines: function(text){
				return new Handlebars.SafeString( Common.break_lines( Common.escape_html( text ) ) );
			},

			condition: function(l, op, r, options){
				var result = false;
				switch (op){
					case '==': {
						result = l == r;
						break;
					}
					case '!=': {
						result = l != r;
						break;
					}
					case '>=':
					case 'gte':
					{
						result = l >= r;
						break;
					}
					case '>':
					case 'gt':
					{
						result = l > r;
						break;
					}
					case '<=':
					case 'lte':
					{
						result = l <= r;
						break;
					}
					case '<':
					case 'lt':
					{
						result = l < r;
						break;
					}
					default: {
						console.error('condition hb tag: unexpected operator "' + op + '".');
						result = false;
					}
				}

				if( result )
					return options.fn(this);
				else
					return options.inverse(this);
			},

			moment: function(dt, format){
				if(!dt) {
					throw 'Date in not defined for \'moment\' Handlebars helper!';
				}

				if (!window.moment){
					throw 'moment hb helper: moment.js lib is not loaded';
				}

				var date = new Date(dt);

				return moment(date).format(format);
			},

			moment_humanize_duration: function(time, format){
				if(!time) {
					throw 'Date in not defined for \'moment_duration\' Handlebars helper!';
				}

				if (!window.moment){
					throw 'moment hb helper: moment.js lib is not loaded';
				}

				time = (typeof time === 'number') ? time : parseInt(time);

				return moment.duration(time, format).humanize();
			},

			money: function(text, currency, currency_position, thousands_separator, multiplier, decimals){
				if (text != null) {
					if (text.indexOf && text.indexOf('.') >= 0) {
						text = text.replace(/,/g, '');
					}
				} else {
					text = 0;
				}

				return Common.money( parseFloat(text), {
					'currency': typeof currency === 'string' ? currency : null,
					'currency_position': typeof currency_position === 'string' ? currency_position : null,
					'thousands_separator':  typeof thousands_separator === 'string' ? thousands_separator : null,
					'multiplier': typeof multiplier === 'string' ? multiplier : null,
					'decimals':  typeof decimals === 'string' ? parseInt(decimals) : null
				} );
			},

			percent: function(text) {
				var result = 0;
				if (text != null) {
					if (text.indexOf && text.indexOf(',') >= 0) {
						text = text.replace(/,/g, '');
					}
					result = Number(text).toFixed(2);
					if (result % 1 === 0) {
						result = parseInt(text);
					}
				}
				return result + '%';
			},

			format_phone: function( number, format ) {
				var cleaned = ('' + number).replace(/\D/g, '');
				var match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
				if (match) {
					var intlCode = (match[1] ? '+1 ' : '');
					var formatted = [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('');
					return new Handlebars.SafeString( formatted );
				}
				return new Handlebars.SafeString( number );
			}

		},

		register_helpers: function(){
			for (var name in this.helpers) {
				Handlebars.registerHelper(name, this.helpers[name]);
			}
		},

		init: function(){
			this.register_helpers();
		}
	};

	return Templates;
});

define('virginia/view',[
	'jquery',
	'handlebars',
	'backbone',
	'virginia/templates'
], function($, Handlebars, Backbone, Templates){

	var BaseView = Backbone.View.extend({

		template_name: 'please set path to template path',

		after_initialize: function(){
			// none
		},

		render: function ( rendered ) {
			var self = this;
			this._rendered = false;

			this
				.load_template(this.template_name)
				.done(function (template) {
					self._render_template(template);
				});

			return this;
		},

		load_template: function(template_name){
			return Templates.get(template_name);
		},

		_render_template: function (template) {
			var context = this.get_context();
			var html = this._process_template(template, context);
			this.template = template;
			this.$el.html(html);
			this.delegateEvents();
			this.after_render();
			this._rendered = true;
			this.trigger('rendered');
		},


		_process_template: function(template, context){
			var html = Templates.render(template, context);
			return html;
		},

		/**
		 *
		 * @param context
		 * @returns rendered string with html
		 */
		html_render: function( context ){
			return this.template( context );
		},

		/**
		 *
		 * @returns rendered status
		 */
		is_rendered: function(){
			return this._rendered || false;
		},

		/**
		 * Creates hb context for rendering.
		 * @returns {{}}
		 */
		get_context: function(){
			// override me
			return {};
		},

		/**
		 * Makes works after view rendered and events assigned
		 */
		after_render: function(){
			// override me
		},

		focus: function(){
			this.$('input:first').focus();
		},


		bind_selectors: function () {
			var base_selectors = _.result(this, 'base_selectors', {});
			var view_selectors = _.result(this, 'selectors', {});
			var selectors = _.extend({}, base_selectors, view_selectors);
			for (var key in selectors) {
				if (selectors.hasOwnProperty(key)) {
					this['$' + key] = this.$(selectors[key]);
				}
			}
		},

		show: function(){
			this.$el.show();
		},

		hide: function(){
			this.$el.hide();
		},

		clear: function(){
			this.undelegateEvents();
			this.stopListening();
			if (this.$el && this.$el.length>0){
				this.$el.empty();
			}
			this.trigger('destroy');
		}


	});

	return BaseView;
});
define('virginia/model-view',[
	'virginia/view'
], function(BaseView){

	var BaseModelView = BaseView.extend({

		initialize: function(options){
			this.options = options;
			this.fetch_model = false;
			this.create_model(options);
			this.fetch_and_render();
			this.after_initialize();
		},

		create_model: function(options){
			if (!this.model) {
				if (options.model_id){
					// try to create model by id
					var ModelClass = options.model_class || this.model_class;
					if (!ModelClass) {
						throw "Virginia.BaseModelView needs model_class";
					}

					var id_name = ModelClass.prototype.idAttribute;
					var attrs = {};
					attrs[id_name] = options.model_id;

					this.model = new ModelClass(attrs, options.model_options || {});
					this.fetch_model = true;
				} else {
					throw "Virginia.BaseModelView needs model or model_id";
				}
			}
		},

		fetch_and_render: function(){
			if (this.fetch_model){
				this.model
					.fetch()
					.done(function () {
						this.render();
					}.bind(this));
				this.fetch_model = false;
			} else {
				this.render();
			}
		},

		get_context: function(){
			return {
				model: this.model.toJSON()
			};
		}

	});

	return BaseModelView;
});
define('virginia/collection-view',[
	'virginia/view'
], function(BaseView){

	BaseCollectionView = BaseView.extend({

		initialize: function(options){
			this.options = options;
			if (!this.collection) {
				var CollectionClass = options.collection_class || this.collection_class;
				if (!CollectionClass) {
					throw "Virginia.BaseCollectionView.initialize needs collection_class";
				}
				this.collection = new CollectionClass([], options.collection_options || {});
				this.fetch_and_render();
			} else {
				this.render();
			}
			this.after_initialize();
		},

		fetch_and_render: function(){
			this.collection
				.fetch()
				.done(function(){
					this.render();
				}.bind(this));
		},

		get_context: function(){
			return {
				collection: this.collection.toJSON()
			};
		}

	});

	return BaseCollectionView;
});
define('virginia',[
	'virginia/templates',
	'virginia/view',
	'virginia/model-view',
	'virginia/collection-view',
	'virginia/common'
], function(Templates, BaseView, BaseModelView, BaseCollectionView, Common) {
	'use strict';

	var Virginia = {
		Templates: Templates,
		BaseView: BaseView,
		BaseModelView: BaseModelView,
		BaseCollectionView: BaseCollectionView,
		Common: Common
	};

	Virginia.Templates.init();

	return Virginia;
});
	define('jquery', function () {
		return $;
	});

	define('underscore', function () {
		return _;
	});

	define('backbone', function () {
		return Backbone;
	});

	define('handlebars', function () {
		return Handlebars;
	});

	return require('virginia');

}));
