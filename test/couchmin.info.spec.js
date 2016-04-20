'use strict';


const Assert = require('assert');
const Rimraf = require('rimraf');
const Exec = require('./exec');


describe('couchmin info', () => {

  before((done) => {

    Rimraf(Exec.confdir, done);
  });

  it('should display system info', (done) => {

    Exec(['info'], (err, stdout, stderr) => {

      Assert.ok(!err);
      Assert.ok(/Couchmin/i.test(stdout));
      Assert.equal(stderr, '');
      done();
    });
  });

});

