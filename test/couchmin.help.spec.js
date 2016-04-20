'use strict';


const Assert = require('assert');
const Exec = require('./exec');


describe('couchmin help', () => {

  it('should show usage when no arguments passed', (done) => {

    Exec([], (err, stdout, stderr) => {

      Assert.ok(!err);
      Assert.ok(/Usage: couchmin \[ options \] <command>/i.test(stdout));
      Assert.equal(stderr, '');
      done();
    });
  });

  it('should show usage when help is passed as only argument', (done) => {

    Exec(['help'], (err, stdout, stderr) => {

      Assert.ok(!err);
      Assert.ok(/Usage: couchmin \[ options \] <command>/i.test(stdout));
      Assert.equal(stderr, '');
      done();
    });
  });

});

