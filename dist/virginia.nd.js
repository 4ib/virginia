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
				result = parseFloat(result);
			}

			if(options.thousands_separator) {
				result = result.toString();
				result = result.replace(/(\d)(?:(?=\d+(?=[^\d.]))(?=(?:\d{3})+\b)|(?=\d+(?=\.))(?=(?:\d{3})+(?=\.)))/g, "$1" + options.thousands_separator);
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
	'virginia/common'
], function(Common){

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
				return decodeURI(text)
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
	'virginia/templates'
], function(Templates){

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
