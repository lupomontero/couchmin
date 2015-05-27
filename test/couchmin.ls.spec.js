var assert = require('assert');
var rimraf = require('rimraf');
var async = require('async');
var _ = require('lodash');
var exec = require('./exec');


function assertHeadingsLine(line) {
  assert.deepEqual(_.compact(line.trim().split(' ')), [
    'NAME', 'ACTIVE', 'TYPE', 'STATUS', 'PID', 'VERSION', 'URI'
  ]);
}

describe('couchmin ls', function () {

  beforeEach(function (done) {
    rimraf(exec.confdir, done);
  });

  it('should show headers and no results when no servers', function (done) {
    exec([ 'ls' ], function (err, stdout, stderr) {
      assert.ok(!err);
      assertHeadingsLine(stdout);
      assert.equal(stderr, '');
      done();
    });
  });

  it('should list servers', function (done) {
    exec([ 'create', 'test-ls' ], function (err) {
      assert.ok(!err);
      exec([ 'ls' ], function (err, stdout) {
        assert.ok(!err);
        var lines = stdout.trim().split('\n');
        assert.equal(lines.length, 2);
        assertHeadingsLine(lines[0]);
        assert.ok(/^test-ls/.test(lines[1]));
        done();
      });
    });
  });

  it('should filter by name', function (done) {
    async.series([
      async.apply(exec, [ 'create', 'test-ls-1' ]),
      async.apply(exec, [ 'create', 'test-ls-2' ]),
      async.apply(exec, [ 'create', 'oh-my-god' ])
    ], function (err) {
      assert.ok(!err);
      exec([ 'ls', '-f', 'name=test-ls' ], function (err, stdout) {
        assert.ok(!err);
        var lines = stdout.trim().split('\n');
        assert.equal(lines.length, 3);
        assertHeadingsLine(lines[0]);
        assert.ok(/test-ls/.test(lines[1]));
        assert.ok(/test-ls/.test(lines[2]));
        done();
      });
    });
  });

  it('should filter by type');

  it('should only show server names when quiet flag present', function (done) {
    async.series([
      async.apply(exec, [ 'create', 'test-ls-1' ]),
      async.apply(exec, [ 'create', 'test-ls-2' ]),
      async.apply(exec, [ 'create', 'oh-my-god' ])
    ], function (err) {
      assert.ok(!err);
      exec([ 'ls', '-q' ], function (err, stdout) {
        assert.ok(!err);
        var lines = stdout.trim().split('\n');
        assert.equal(lines.length, 3);
        assert.deepEqual(lines, [ 'test-ls-1', 'test-ls-2', 'oh-my-god' ]);
        done();
      });
    });
  });

});

