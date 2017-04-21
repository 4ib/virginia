const gulp = require( 'gulp' );
const requirejsOptimize = require( 'gulp-requirejs-optimize' );
const rename = require( 'gulp-rename' );
var runSequence = require( 'run-sequence' );
const config = require( './build/config.js' );
const configAmd = require( './build/config.amd.js' );

gulp.task( 'build', function() {
	return gulp.src( 'lib/virginia.js' )
		.pipe( requirejsOptimize( config ) )
		.pipe( gulp.dest( 'dist' ) );
} );

gulp.task( 'build-min', function() {
	let configMin = config;
	configMin.optimize = 'uglify';
	return gulp.src( 'lib/virginia.js' )
		.pipe( requirejsOptimize( configMin ) )
		.pipe( rename( 'virginia.min.js' ) )
		.pipe( gulp.dest( 'dist' ) );
} );

gulp.task( 'build-amd', function() {
	return gulp.src( 'lib/virginia.js' )
		.pipe( requirejsOptimize( configAmd ) )
		.pipe( rename( 'virginia.amd.js' ) )
		.pipe( gulp.dest( 'dist' ) );
} );

gulp.task( 'build-amd-min', function() {
	let configAmdMin = configAmd;
	configAmdMin.optimize = 'uglify';
	return gulp.src( 'lib/virginia.js' )
		.pipe( requirejsOptimize( configAmdMin ) )
		.pipe( rename( 'virginia.amd.min.js' ) )
		.pipe( gulp.dest( 'dist' ) );
} );

gulp.task( 'default', function() {
	runSequence(
		'build',
		'build-min',
		'build-amd',
		'build-amd-min'
	);
} );