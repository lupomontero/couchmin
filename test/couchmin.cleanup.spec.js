'use strict';


const Assert = require('assert');
const Rimraf = require('rimraf');
const Exec = require('./exec');
const Start = require('./start');


describe('couchmin cleanup', () => {

  before((done) => {

    Rimraf(Exec.confdir, done);
  });


  it('should throw when no server selected', (done) => {

    Exec(['cleanup'], (err) => {

      Assert.equal(err.code, 1);
      Assert.ok(/No server selected/i.test(err.message));
      done();
    });
  });


  it('should cleanup when all good', function (done) {

    this.timeout(10 * 1000);

    const name = 'test-cleanup';

    Start(name, (err) => {

      Assert.ok(!err);
      Exec(['cleanup', name], (err, stdout, stderr) => {

        Assert.ok(!err);
        Assert.ok(/Started cleanup task/i.test(stdout));
        Exec(['stop', name], done);
      });
    });
  });

});

