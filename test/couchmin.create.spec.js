var assert = require('assert');
var request = require('request').defaults({ json: true });
var rimraf = require('rimraf');
var exec = require('./exec');


describe('couchmin create', function () {

  before(function (done) {
    rimraf(exec.confdir, done);
  });

  it('should throw when too few arguments', function (done) {
    exec([ 'create' ], function (err, stdout, stderr) {
      assert.equal(err.code, 1);
      assert.ok(/Too few arguments/i.test(err.message));
      assert.equal(stdout, '');
      assert.equal(stderr.trim(), 'Too few arguments');
      done();
    });
  });

  it('should create server in admin party by default', function (done) {
    this.timeout(10 * 1000);

    exec([ 'create', 'foo' ], function (err, stdout, stderr) {
      assert.ok(!err);
      assert.equal(stdout, '');
      assert.equal(stderr, '');

      exec([ 'start', 'foo' ], function (err, stdout, stderr) {
        assert.ok(!err);
        assert.equal(stdout, '');
        assert.equal(stderr, '');

        // Wait for server to start...
        setTimeout(function () {
          request('http://127.0.0.1:5000/_session', function (err, resp) {
            assert.ok(!err);
            assert.equal(resp.body.ok, true);
            assert.equal(resp.body.userCtx.name, null);
            assert.deepEqual(resp.body.userCtx.roles, [ '_admin' ]);

            exec([ 'stop', 'foo' ], function (err, stdout, stderr) {
              assert.ok(!err);
              assert.equal(stdout, '');
              assert.equal(stderr, '');
              done();
            });
          });
        }, 2 * 1000);
      });
    });
  });

  it('should create server with admin when pass present', function (done) {
    this.timeout(10 * 1000);

    var name = 'foo2';

    exec([ 'create', name, '--pass', 'secret' ], function (err, stdout, stderr) {
      assert.ok(!err);
      assert.equal(stdout, '');
      assert.equal(stderr, '');

      exec([ 'start', name ], function (err, stdout, stderr) {
        assert.ok(!err);
        assert.equal(stdout, '');
        assert.equal(stderr, '');

        // Wait for server to start...
        setTimeout(function () {
          request('http://admin:secret@127.0.0.1:5001/_session', function (err, resp) {
            assert.ok(!err);
            assert.equal(resp.body.ok, true);
            assert.equal(resp.body.userCtx.name, 'admin');
            assert.deepEqual(resp.body.userCtx.roles, [ '_admin' ]);

            exec([ 'stop', name ], function (err, stdout, stderr) {
              assert.ok(!err);
              assert.equal(stdout, '');
              assert.equal(stderr, '');
              done();
            });
          });
        }, 2 * 1000);
      });
    });
  });

});

