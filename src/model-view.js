define([
	'src/view'
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