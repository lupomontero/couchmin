'use strict';


const Assert = require('assert');
const Exec = require('./exec');
const Start = require('./start');


describe('couchmin rm', () => {

  it('should throw when no server name provided', (done) => {

    Exec(['rm'], (err) => {

      Assert.ok(err);
      Assert.equal(err.code, 1);
      Assert.ok(/Server name is required/i.test(err.message));
      done();
    });
  });


  it('should throw when server doesn\'t exist', (done) => {

    Exec(['rm', 'non-existent'], (err, stdout, stderr) => {

      Assert.ok(err);
      Assert.equal(err.code, 1);
      Assert.ok(/Server doesn't exist/i.test(err.message));
      done();
    });
  });

  it('should remove a newly created local server', (done) => {

    Exec(['create', 'test-rm'], (err) => {

      Assert.ok(!err);
      Exec(['rm', 'test-rm'], (err, stdout) => {

        Assert.ok(!err);
        Assert.equal(stdout, '');
        done();
      });
    });
  });

  it('should stop and remove running local server', function (done) {

    this.timeout(5 * 1000);

    Start('test-rm', (err) => {

      Assert.ok(!err);
      Exec(['rm', 'test-rm'], (err, stdout) => {

        Assert.ok(!err);
        Assert.equal(stdout, '');
        done();
      });
    });
  });

});

