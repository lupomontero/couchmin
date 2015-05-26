var gulp = require('gulp');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');


var files = [ 'gulpfile.js', 'bin/**/*.js', 'cmd/**/*.js', 'test/**/*.js' ];


gulp.task('lint', function () {
  return gulp.src(files)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});


gulp.task('test', [ 'lint' ], function () {
  return gulp.src('test/**/*.spec.js', { read: false }).pipe(mocha());
});


gulp.task('watch', function () {
  gulp.watch(files, [ 'test' ]);
});


gulp.task('default', [ 'test' ]);

