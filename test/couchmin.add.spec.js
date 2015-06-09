var assert = require('assert');
var rimraf = require('rimraf');
var exec = require('./exec');
var http = require('http');


describe('couchmin add', function () {

  before(function (done) {
    rimraf(exec.confdir, done);
  });

  it('should throw when no arguments', function (done) {
    exec([ 'add' ], function (err) {
      assert.equal(err.code, 1);
      assert.ok(/Too few arguments/i.test(err.message));
      done();
    });
  });

  it('should throw when no url', function (done) {
    exec([ 'add', 'test-add' ], function (err) {
      assert.equal(err.code, 1);
      assert.ok(/Too few arguments/i.test(err.message));
      done();
    });
  });

  it('should throw when invalid url', function (done) {
    exec([ 'add', 'test-add', 'foo' ], function (err, stdout, stderr) {
      assert.ok(err);
      assert.equal(err.code, 1);
      assert.ok(/Invalid URL/i.test(err.message));
      done();
    });
  });

  it('should throw when url is down', function (done) {
    exec([ 'add', 'test-add', 'http://fooo-151987654-notreally.name' ], function (err, stdout) {
      assert.ok(err);
      assert.equal(stdout, '');
      assert.ok(/ENOTFOUND/i.test(err.message));
      done();
    });
  });

  it('should throw when response is not 200', function (done) {
    var server = http.createServer(function (req, resp) {
      resp.statusCode = 404;
      resp.end();
    });
    server.listen(8889, function () {
      exec([ 'add', 'test-add', 'http://127.0.0.1:8889' ], function (err) {
        assert.ok(err);
        assert.ok(/Server responded with 404/i.test(err.message));
        server.close(done);
      });
    });
  });

  it('should throw when response is not couchdb', function (done) {
    var server = http.createServer(function (req, resp) {
      resp.write('hello');
      resp.end();
    });
    server.listen(8889, function () {
      exec([ 'add', 'test-add', 'http://127.0.0.1:8889' ], function (err) {
        assert.ok(err);
        assert.ok(/Server doesn't seem to be a CouchDB instance/i.test(err.message));
        server.close(done);
      });
    });
  });

  it('should throw when server name exists', function (done) {
    exec([ 'create', 'test-add' ], function (err) {
      assert.ok(!err);
      var server = http.createServer(function (req, resp) {
        resp.setHeader('content-type', 'application/json');
        resp.write('{"couchdb":"Welcome","version":"1.6.1"}');
        resp.end();
      });
      server.listen(8889, function () {
        exec([ 'add', 'test-add', 'http://127.0.0.1:8889' ], function (err) {
          assert.ok(err);
          assert.ok(/already exists/i.test(err.message));
          exec([ 'rm', 'test-add' ], function (err) {
            assert.ok(!err);
            server.close(done);
          });
        });
      });
    });
  });

  it('should add when response is couchdb', function (done) {
    var server = http.createServer(function (req, resp) {
      resp.setHeader('content-type', 'application/json');
      resp.write('{"couchdb":"Welcome","version":"1.6.1"}');
      resp.end();
    });
    server.listen(8889, function () {
      exec([ 'add', 'test-add', 'http://127.0.0.1:8889' ], function (err, stdout) {
        assert.ok(!err);
        assert.equal(stdout, '');
        server.close(done);
      });
    });
  });

});

