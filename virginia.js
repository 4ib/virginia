define(function(require) {
	'use strict';

	var Virginia = {
		Templates: require('src/templates'),
		BaseView: require('src/view'),
		BaseModelView: require('src/model-view'),
		BaseCollectionView: require('src/collection-view'),
		Common: require('src/common')
	};

	Virginia.Templates.init();

	return {
		version: '0.0.1',
		Virginia: Virginia
	};
});