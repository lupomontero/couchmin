var assert = require('assert');
var exec = require('./exec');
var start = require('./start');


describe('couchmin rm', function () {

  it('should throw when no server name provided', function (done) {
    exec([ 'rm' ], function (err) {
      assert.ok(err);
      assert.equal(err.code, 1);
      assert.ok(/Server name is required/i.test(err.message));
      done();
    });
  });

  it('should throw when server doesn\'t exist', function (done) {
    exec([ 'rm', 'non-existent' ], function (err, stdout, stderr) {
      assert.ok(err);
      assert.equal(err.code, 1);
      assert.ok(/Server doesn't exist/i.test(err.message));
      done();
    });
  });

  it('should remove a newly created local server', function (done) {
    exec([ 'create', 'test-rm' ], function (err) {
      assert.ok(!err);
      exec([ 'rm', 'test-rm' ], function (err, stdout) {
        assert.ok(!err);
        assert.equal(stdout, '');
        done();
      });
    });
  });

  it('should stop and remove running local server', function (done) {
    this.timeout(5 * 1000);
    start('test-rm', function (err) {
      assert.ok(!err);
      exec([ 'rm', 'test-rm' ], function (err, stdout) {
        assert.ok(!err);
        assert.equal(stdout, '');
        done();
      });
    });
  });

});

