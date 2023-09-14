define([
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
			var html = '';
			try {
				html = Templates.render(template, context);
				return html;
			} catch (e) {
				var errorMSG = document.createElement('div');
				var msg = 'Can`t render template: ' + this.template_name;

				errorMSG.style.backgroundColor = '#fff';
				errorMSG.style.color = '#f00';
				errorMSG.style.position = 'fixed';
				errorMSG.style.top = '0';
				errorMSG.style.left = '0';
				errorMSG.style.width = '100%';
				errorMSG.style.zIndex = '9999';
				errorMSG.style.padding = '20px';
				errorMSG.style.textAlign = 'center';
				errorMSG.style.borderBottom = '1px solid #ccc';
				errorMSG.style.fontSize = '16px';

				if (e.message) {
					msg += '<br>' + e.message;
				}
				errorMSG.innerHTML = msg;

				document.body.appendChild(errorMSG);
				throw new Error('Can`t render template: ' + this.template_name);
			}
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