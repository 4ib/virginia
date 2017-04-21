module.exports = {
	"paths": {
		"virginia": "virginia",
        "jquery": "../node_modules/jquery/dist/jquery",
        "underscore": "../node_modules/underscore/underscore",
        "backbone": "../node_modules/backbone/backbone",
        "handlebars": "../node_modules/handlebars/dist/handlebars"
	},
	"include": ["../node_modules/almond/almond", "virginia"],
	"exclude": ["jquery", "underscore", "backbone", "handlebars"],
    "optimize": "none",
    "wrap": {
		"startFile": "build/wrap.start.js",
		"endFile": "build/wrap.end.js"
	}
}