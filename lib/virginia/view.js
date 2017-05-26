define([
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