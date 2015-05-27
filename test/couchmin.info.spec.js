var assert = require('assert');
var rimraf = require('rimraf');
var exec = require('./exec');


describe('couchmin info', function () {

  before(function (done) {
    rimraf(exec.confdir, done);
  });

  it('should display system info', function (done) {
    exec([ 'info' ], function (err, stdout, stderr) {
      assert.ok(!err);
      assert.ok(/Couchmin/i.test(stdout));
      assert.equal(stderr, '');
      done();
    });
  });

});

