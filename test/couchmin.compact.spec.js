var assert = require('assert');
var rimraf = require('rimraf');
var exec = require('./exec');
var start = require('./start');


describe('couchmin compact', function () {

  before(function (done) {
    rimraf(exec.confdir, done);
  });

  it('should throw when no server selected', function (done) {
    exec([ 'compact' ], function (err) {
      assert.ok(err);
      assert.equal(err.code, 1);
      assert.ok(/No server selected/i.test(err.message));
      done();
    });
  });

  it('should throw when server doesn\'t exist', function (done) {
    exec([ 'compact', 'non-existent' ], function (err, stdout, stderr) {
      assert.ok(err);
      assert.equal(err.code, 1);
      assert.ok(/Server doesn't exist/i.test(err.message));
      done();
    });
  });

  it('should throw when local server has never been started', function (done) {
    exec([ 'create', 'test-compact' ], function (err) {
      assert.ok(!err);
      exec([ 'compact', 'test-compact' ], function (err) {
        assert.ok(err);
        assert.equal(err.code, 1);
        assert.ok(/Could not figure out server URL. Is it running?/i.test(err.message));
        exec([ 'rm', 'test-compact' ], done);
      });
    });
  });

  it('should compact all dbs on newly created server', function (done) {
    this.timeout(5 * 1000);
    start('test-compact', function (err) {
      assert.ok(!err);
      exec([ 'compact', 'test-compact' ], function (err, stdout) {
        assert.ok(!err);
        assert.ok(/Compacting database _users/i.test(stdout));
        assert.ok(/Compacting design doc _design\/_auth in _users/i.test(stdout));
        exec([ 'rm', 'test-compact' ], done);
      });
    });
  });

});

