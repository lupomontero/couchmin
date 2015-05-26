var assert = require('assert');
var exec = require('./exec');


describe('couchmin', function () {

  it('should show usage when no arguments passed', function (done) {
    exec([], function (err, stdout, stderr) {
      assert.ok(!err);
      assert.ok(/Usage: couchmin \[ options \] <command>/i.test(stdout));
      assert.equal(stderr, '');
      done();
    });
  });

  it('should show usage when help is passed as only argument', function (done) {
    exec([ 'help' ], function (err, stdout, stderr) {
      assert.ok(!err);
      assert.ok(/Usage: couchmin \[ options \] <command>/i.test(stdout));
      assert.equal(stderr, '');
      done();
    });
  });

});

