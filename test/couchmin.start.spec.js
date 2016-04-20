'use strict';


const Assert = require('assert');
const Http = require('http');
const Rimraf = require('rimraf');
const Exec = require('./exec');
const Start = require('./start');


describe('couchmin start', () => {

  const name = 'test-start';

  before((done) => {

    Rimraf(Exec.confdir, done);
  });


  it('should throw when server not specified', (done) => {

    Exec(['start'], (err, stdout, stderr) => {

      Assert.ok(err);
      Assert.equal(err.code, 1);
      Assert.ok(/Server name is required/i.test(err.message));
      done();
    });
  });


  it('should throw when server does not exist', (done) => {

    Exec(['start', name], (err, stdout, stderr) => {

      Assert.ok(err);
      Assert.equal(err.code, 1);
      Assert.ok(/Server doesn't exist/i.test(err.message));
      done();
    });
  });


  it('should throw when trying to start remore server', (done) => {

    const server = Http.createServer((req, resp) => {

      resp.setHeader('content-type', 'application/json');
      resp.write('{"couchdb":"Welcome","version":"1.6.1"}');
      resp.end();
    });

    server.listen(8889, () => {

      Exec(['add', name, 'http://127.0.0.1:8889'], (err) => {

        Assert.ok(!err);

        Exec(['start', name], (err, stdout) => {

          Assert.ok(err);
          Assert.equal(err.code, 1);
          Assert.ok(/Can not start a remote server/i.test(err.message));

          Exec(['rm', name], (err) => {

            Assert.ok(!err);
            server.close(done);
          });
        });
      });
    });
  });

  it('should successfully start a newly created server', function (done) {

    this.timeout(5 * 1000);

    Exec(['create', name], (err) => {

      Assert.ok(!err);

      Exec(['start', name], (err, stdout) => {

        Assert.ok(!err);
        Assert.ok(/started/i.test(stdout));
        Exec(['rm', name], done);
      });
    });
  });

  it('should not do anything when already started?', function (done) {

    this.timeout(15 * 1000);

    Start(name, (err) => {

      Assert.ok(!err);

      Exec(['ls'], (err, stdout) => {

        Assert.ok(!err);
        const pid = stdout.trim().split('\n').reduce((memo, line) => {

          const cols = line.split(/\s+/);
          if (cols[0] === name) {
            return cols[3];
          }
          return memo;
        }, null);
        Exec(['start', name], (err, stdout) => {

          Assert.ok(!err);
          // pid should be the same as before.
          Assert.ok((new RegExp('running as process ' + pid, 'i')).test(stdout));
          Exec(['rm', name], done);
        });
      });
    });
  });

  it('should start active server when not passed as arg', function (done) {

    this.timeout(5 * 1000);

    Exec(['create', name], (err) => {

      Assert.ok(!err);
      Exec(['active', name], (err) => {

        Assert.ok(!err);
        Exec(['start'], (err, stdout) => {

          Assert.ok(!err);
          Assert.ok(/started/i.test(stdout));
          Exec(['rm', name], done);
        });
      });
    });
  });

});

