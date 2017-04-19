(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD.
		define(['jquery', 'underscore', 'backbone', 'handlebars'], factory);
	} else {
		// Browser globals
		root.Virginia = factory(root.$, root._, root.Backbone, root.Handlebars);
	}
}(this, function ($, _, Backbone, Handlebars) {
