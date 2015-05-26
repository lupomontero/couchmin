var assert = require('assert');
var rimraf = require('rimraf');
var exec = require('./exec');


describe('couchmin cleanup', function () {

  before(function (done) {
    rimraf(exec.confdir, done);
  });

  it('should throw when no server selected', function (done) {
    exec([ 'cleanup' ], function (err) {
      assert.equal(err.code, 1);
      assert.ok(/No server selected/i.test(err.message));
      done();
    });
  });

  it('should cleanup when all good', function (done) {
    this.timeout(10 * 1000);

    var name = 'test-cleanup';

    exec([ 'create', name ], function (err) {
      assert.ok(!err);

      exec([ 'start', name ], function (err) {
        assert.ok(!err);

        setTimeout(function () {
          exec([ 'cleanup', name ], function (err, stdout, stderr) {
            assert.ok(!err);
            assert.ok(/Started cleanup task/i.test(stdout));

            exec([ 'stop', name  ], function (err) {
              assert.ok(!err);
              done();
            });
          });
        }, 2 * 1000);
      });
    });
  });

});

