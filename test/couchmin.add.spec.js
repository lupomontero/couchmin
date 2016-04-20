'use strict';


const Assert = require('assert');
const Http = require('http');
const Rimraf = require('rimraf');
const Exec = require('./exec');


describe('couchmin add', () => {

  const name = 'test-add';

  before((done) => {

    Rimraf(Exec.confdir, done);
  });


  it('should throw when no arguments', (done) => {

    Exec(['add'], (err) => {

      Assert.equal(err.code, 1);
      Assert.ok(/Too few arguments/i.test(err.message));
      done();
    });
  });


  it('should throw when no url', (done) => {

    Exec(['add', name], (err) => {

      Assert.equal(err.code, 1);
      Assert.ok(/Too few arguments/i.test(err.message));
      done();
    });
  });


  it('should throw when invalid url', (done) => {

    Exec(['add', name, 'foo'], (err, stdout, stderr) => {

      Assert.ok(err);
      Assert.equal(err.code, 1);
      Assert.ok(/Invalid URL/i.test(err.message));
      done();
    });
  });


  it('should throw when url is down', function (done) {

    this.timeout(11 * 1000);

    Exec(['add', name, 'http://fooo-151987654-notreally.name'], (err, stdout) => {

      Assert.ok(err);
      Assert.equal(stdout, '');
      Assert.ok(/ENOTFOUND/i.test(err.message));
      done();
    });
  });


  it('should throw when response is not 200', (done) => {

    const server = Http.createServer((req, resp) => {

      resp.statusCode = 404;
      resp.end();
    });

    server.listen(8889, () => {

      Exec(['add', name, 'http://127.0.0.1:8889'], (err) => {

        Assert.ok(err);
        Assert.ok(/Server responded with 404/i.test(err.message));
        server.close(done);
      });
    });
  });


  it('should throw when response is not couchdb', (done) => {

    const server = Http.createServer((req, resp) => {

      resp.write('hello');
      resp.end();
    });

    server.listen(8889, () => {

      Exec(['add', name, 'http://127.0.0.1:8889'], (err) => {

        Assert.ok(err);
        Assert.ok(/Server doesn't seem to be a CouchDB instance/i.test(err.message));
        server.close(done);
      });
    });
  });


  it('should throw when server name exists', (done) => {

    Exec(['create', name], (err) => {

      Assert.ok(!err);

      const server = Http.createServer((req, resp) => {

        resp.setHeader('content-type', 'application/json');
        resp.write('{"couchdb":"Welcome","version":"1.6.1"}');
        resp.end();
      });

      server.listen(8889, () => {

        Exec(['add', name, 'http://127.0.0.1:8889'], (err) => {

          Assert.ok(err);
          Assert.ok(/already exists/i.test(err.message));

          Exec(['rm', name], (err) => {

            Assert.ok(!err);
            server.close(done);
          });
        });
      });
    });
  });


  it('should add when response is couchdb', (done) => {

    const server = Http.createServer((req, resp) => {

      resp.setHeader('content-type', 'application/json');
      resp.write('{"couchdb":"Welcome","version":"1.6.1"}');
      resp.end();
    });

    server.listen(8889, () => {

      Exec(['add', name, 'http://127.0.0.1:8889'], (err, stdout) => {

        Assert.ok(!err);
        Assert.equal(stdout, '');
        server.close(done);
      });
    });
  });

});

