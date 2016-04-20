'use strict';


const Assert = require('assert');
const Request = require('request').defaults({ json: true });
const Rimraf = require('rimraf');
const Exec = require('./exec');


describe('couchmin create', () => {

  before((done) => {

    Rimraf(Exec.confdir, done);
  });


  it('should throw when too few arguments', (done) => {

    Exec(['create'], (err, stdout, stderr) => {

      Assert.equal(err.code, 1);
      Assert.ok(/Too few arguments/i.test(err.message));
      Assert.equal(stdout, '');
      Assert.equal(stderr.trim(), 'Too few arguments');
      done();
    });
  });


  it('should create server in admin party by default', function (done) {

    this.timeout(10 * 1000);

    Exec(['create', 'foo'], (err, stdout, stderr) => {

      Assert.ok(!err);
      Assert.equal(stdout, '');
      Assert.equal(stderr, '');

      Exec(['start', 'foo'], (err, stdout, stderr) => {

        Assert.ok(!err);
        Assert.equal(stdout.trim(), 'Apache CouchDB has started, time to relax.');
        Assert.equal(stderr, '');

        // Wait for server to start...
        setTimeout(() => {

          Request('http://127.0.0.1:5000/_session', (err, resp) => {

            Assert.ok(!err);
            Assert.equal(resp.body.ok, true);
            Assert.equal(resp.body.userCtx.name, null);
            Assert.deepEqual(resp.body.userCtx.roles, ['_admin']);

            Exec(['stop', 'foo'], (err, stdout, stderr) => {

              Assert.ok(!err);
              Assert.equal(stdout, '');
              Assert.equal(stderr, '');
              done();
            });
          });
        }, 2 * 1000);
      });
    });
  });


  it('should create server with admin when pass present', function (done) {

    this.timeout(10 * 1000);

    const name = 'foo2';

    Exec(['create', name, '--pass', 'secret'], (err, stdout, stderr) => {

      Assert.ok(!err);
      Assert.equal(stdout, '');
      Assert.equal(stderr, '');

      Exec(['start', name], (err, stdout, stderr) => {

        Assert.ok(!err);
        Assert.equal(stdout.trim(), 'Apache CouchDB has started, time to relax.');
        Assert.equal(stderr, '');

        // Wait for server to start...
        setTimeout(() => {

          Request('http://admin:secret@127.0.0.1:5001/_session', (err, resp) => {

            Assert.ok(!err);
            Assert.equal(resp.body.ok, true);
            Assert.equal(resp.body.userCtx.name, 'admin');
            Assert.deepEqual(resp.body.userCtx.roles, ['_admin']);

            Exec(['stop', name], (err, stdout, stderr) => {

              Assert.ok(!err);
              Assert.equal(stdout, '');
              Assert.equal(stderr, '');
              done();
            });
          });
        }, 2 * 1000);
      });
    });
  });

});

