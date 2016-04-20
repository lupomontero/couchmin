'use strict';


const Assert = require('assert');
const Rimraf = require('rimraf');
const Exec = require('./exec');
const Start = require('./start');


describe('couchmin compact', () => {

  const name = 'test-compact';

  before((done) => {

    Rimraf(Exec.confdir, done);
  });


  it('should throw when no server selected', (done) => {

    Exec(['compact'], (err) => {

      Assert.ok(err);
      Assert.equal(err.code, 1);
      Assert.ok(/No server selected/i.test(err.message));
      done();
    });
  });


  it('should throw when server doesn\'t exist', (done) => {

    Exec(['compact', name], (err, stdout, stderr) => {

      Assert.ok(err);
      Assert.equal(err.code, 1);
      Assert.ok(/Server doesn't exist/i.test(err.message));
      done();
    });
  });


  it('should throw when local server has never been started', (done) => {

    Exec(['create', name], (err) => {

      Assert.ok(!err);
      Exec(['compact', name], (err) => {

        Assert.ok(err);
        Assert.equal(err.code, 1);
        Assert.ok(/Could not figure out server URL. Is it running?/i.test(err.message));
        Exec(['rm', name], done);
      });
    });
  });

  it('should compact all dbs on newly created server', function (done) {

    this.timeout(5 * 1000);

    Start(name, (err) => {

      Assert.ok(!err);
      Exec(['compact', name], (err, stdout) => {

        Assert.ok(!err);
        Assert.ok(/Compacting database _users/i.test(stdout));
        Assert.ok(/Compacting design doc _design\/_auth in _users/i.test(stdout));
        Exec(['rm', name], done);
      });
    });
  });

});

