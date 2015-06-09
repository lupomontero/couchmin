var assert = require('assert');
var http = require('http');
var rimraf = require('rimraf');
var exec = require('./exec');
var start = require('./start');


describe('couchmin start', function () {

  var name = 'test-start';

  before(function (done) {
    rimraf(exec.confdir, done);
  });

  it('should throw when server not specified', function (done) {
    exec([ 'start' ], function (err, stdout, stderr) {
      assert.ok(err);
      assert.equal(err.code, 1);
      assert.ok(/Server name is required/i.test(err.message));
      done();
    });
  });

  it('should throw when server does not exist', function (done) {
    exec([ 'start', name ], function (err, stdout, stderr) {
      assert.ok(err);
      assert.equal(err.code, 1);
      assert.ok(/Server doesn't exist/i.test(err.message));
      done();
    });
  });

  it('should throw when trying to start remore server', function (done) {
    var server = http.createServer(function (req, resp) {
      resp.setHeader('content-type', 'application/json');
      resp.write('{"couchdb":"Welcome","version":"1.6.1"}');
      resp.end();
    });
    server.listen(8889, function () {
      exec([ 'add', name, 'http://127.0.0.1:8889' ], function (err) {
        assert.ok(!err);
        exec([ 'start', name ], function (err, stdout) {
          assert.ok(err);
          assert.equal(err.code, 1);
          assert.ok(/Can not start a remote server/i.test(err.message));
          exec([ 'rm', name ], function (err) {
            assert.ok(!err);
            server.close(done);
          });
        });
      });
    });
  });

  it('should successfully start a newly created server', function (done) {
    this.timeout(5 * 1000);
    exec([ 'create', name ], function (err) {
      assert.ok(!err);
      exec([ 'start', name ], function (err, stdout) {
        assert.ok(!err);
        assert.ok(/started/i.test(stdout));
        exec([ 'rm', name ], done);
      });
    });
  });

  it('should not do anything when already started?', function (done) {
    this.timeout(15 * 1000);
    start(name, function (err) {
      assert.ok(!err);
      exec([ 'ls' ], function (err, stdout) {
        assert.ok(!err);
        var pid = stdout.trim().split('\n').reduce(function (memo, line) {
          var cols = line.split(/\s+/);
          if (cols[0] === name) { return cols[3]; }
          return memo;
        }, null);
        exec([ 'start', name ], function (err, stdout) {
          assert.ok(!err);
          // pid should be the same as before.
          assert.ok((new RegExp('running as process ' + pid, 'i')).test(stdout));
          exec([ 'rm', name ], done);
        });
      });
    });
  });

  it('should start active server when not passed as arg', function (done) {
    this.timeout(5 * 1000);
    exec([ 'create', name ], function (err) {
      assert.ok(!err);
      exec([ 'active', name ], function (err) {
        assert.ok(!err);
        exec([ 'start' ], function (err, stdout) {
          assert.ok(!err);
          assert.ok(/started/i.test(stdout));
          exec([ 'rm', name ], done);
        });
      });
    });
  });

});

