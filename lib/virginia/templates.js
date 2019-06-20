define([
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

			money: function(text, currency, currency_position, thousands_separator, multiplier){
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
					'multiplier': typeof multiplier === 'string' ? multiplier : null
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
