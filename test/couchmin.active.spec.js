var assert = require('assert');
var rimraf = require('rimraf');
var exec = require('./exec');


describe('couchmin active', function () {

  before(function (done) {
    rimraf(exec.confdir, done);
  });

  it('should show "none" when no active server', function (done) {
    exec([ 'active' ], function (err, stdout, stderr) {
      assert.ok(!err);
      assert.equal(stdout.trim(), 'none');
      done();
    });
  });

  it('should throw when setting non existent server', function (done) {
    exec([ 'active', 'nooooo' ], function (err, stdout, stderr) {
      assert.equal(err.code, 1);
      assert.ok(/Server "nooooo" doesn't exist/i.test(err.message));
      done();
    });
  });

  it('should set server and then get it', function (done) {
    exec([ 'create', 'test-active' ], function (err) {
      assert.ok(!err);

      exec([ 'active', 'test-active' ], function (err) {
        assert.ok(!err);

        exec([ 'active' ], function (err, stdout) {
          assert.ok(!err);
          assert.equal(stdout.trim(), 'test-active');
          done();
        });
      });
    });
  });

});

