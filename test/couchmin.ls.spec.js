'use strict';


const Assert = require('assert');
const Rimraf = require('rimraf');
const Async = require('async');
const _ = require('lodash');
const Exec = require('./exec');


const assertHeadingsLine = function (line) {

  Assert.deepEqual(_.compact(line.trim().split(' ')), [
    'NAME', 'ACTIVE', 'TYPE', 'STATUS', 'PID', 'VERSION', 'URI'
  ]);
};

describe('couchmin ls', () => {

  beforeEach((done) => {

    Rimraf(Exec.confdir, done);
  });


  it('should show headers and no results when no servers', (done) => {

    Exec(['ls'], (err, stdout, stderr) => {

      Assert.ok(!err);
      assertHeadingsLine(stdout);
      Assert.equal(stderr, '');
      done();
    });
  });


  it('should list servers', (done) => {

    Exec(['create', 'test-ls'], (err) => {

      Assert.ok(!err);

      Exec(['ls'], (err, stdout) => {

        Assert.ok(!err);
        const lines = stdout.trim().split('\n');
        Assert.equal(lines.length, 2);
        assertHeadingsLine(lines[0]);
        Assert.ok(/^test-ls/.test(lines[1]));
        done();
      });
    });
  });

  it('should filter by name', (done) => {

    Async.series([
      Async.apply(Exec, ['create', 'test-ls-1']),
      Async.apply(Exec, ['create', 'test-ls-2']),
      Async.apply(Exec, ['create', 'oh-my-god'])
    ], (err) => {

      Assert.ok(!err);
      Exec(['ls', '-f', 'name=test-ls'], (err, stdout) => {

        Assert.ok(!err);
        const lines = stdout.trim().split('\n');
        Assert.equal(lines.length, 3);
        assertHeadingsLine(lines[0]);
        Assert.ok(/test-ls/.test(lines[1]));
        Assert.ok(/test-ls/.test(lines[2]));
        done();
      });
    });
  });

  it('should filter by type');

  it('should only show server names when quiet flag present', (done) => {

    Async.series([
      Async.apply(Exec, ['create', 'test-ls-1']),
      Async.apply(Exec, ['create', 'test-ls-2']),
      Async.apply(Exec, ['create', 'oh-my-god'])
    ], (err) => {

      Assert.ok(!err);
      Exec(['ls', '-q'], (err, stdout) => {

        Assert.ok(!err);
        const lines = stdout.trim().split('\n');
        Assert.equal(lines.length, 3);
        Assert.deepEqual(lines, ['test-ls-1', 'test-ls-2', 'oh-my-god']);
        done();
      });
    });
  });

});

