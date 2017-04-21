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