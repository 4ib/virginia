define([
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