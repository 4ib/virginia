{
	"baseUrl": "../",
	"paths": {
		"virginia": "virginia",
        "jquery": "node_modules/jquery/dist/jquery",
        "underscore": "node_modules/underscore/underscore",
        "backbone": "node_modules/backbone/backbone",
        "handlebars": "node_modules/handlebars/dist/handlebars"
	},
	"include": ["virginia"],
	"exclude": ["jquery", "underscore", "backbone", "handlebars"],
	"out": "../dist/virginia.min.js",
    //"optimize": "none",
	"wrap": {
		"startFile": "wrap.start.js",
		"endFile": "wrap.end.js"
	}
}