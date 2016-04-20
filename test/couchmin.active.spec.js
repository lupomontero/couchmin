'use strict';


const Assert = require('assert');
const Rimraf = require('rimraf');
const Exec = require('./exec');


describe('couchmin active', () => {

  before((done) => {

    Rimraf(Exec.confdir, done);
  });


  it('should show "none" when no active server', (done) => {

    Exec(['active'], (err, stdout, stderr) => {

      Assert.ok(!err);
      Assert.equal(stdout.trim(), 'none');
      done();
    });
  });


  it('should throw when setting non existent server', (done) => {

    Exec(['active', 'nooooo'], (err, stdout, stderr) => {

      Assert.equal(err.code, 1);
      Assert.ok(/Server "nooooo" doesn't exist/i.test(err.message));
      done();
    });
  });


  it('should set server and then get it', (done) => {

    Exec(['create', 'test-active'], (err) => {

      Assert.ok(!err);

      Exec(['active', 'test-active'], (err) => {

        Assert.ok(!err);

        Exec(['active'], (err, stdout) => {

          Assert.ok(!err);
          Assert.equal(stdout.trim(), 'test-active');
          done();
        });
      });
    });
  });

});

