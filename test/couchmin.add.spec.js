var assert = require('assert');
var exec = require('./exec');


describe('couchmin add', function () {

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

  it('should throw when url is down');
  it('should throw when response is not 200');
  it('should throw when response is not couchdb');
  it('should add when response is couchdb');
  it('should throw when server name exists');

});

