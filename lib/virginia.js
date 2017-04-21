define([
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