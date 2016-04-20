'use strict';


const Assert = require('assert');
const Exec = require('./exec');


describe('couchmin push', () => {

  it.skip('should ...', (done) => {

    Exec(['push'], (err, stdout, stderr) => {

      Assert.ok(!err);
      done();
    });
  });

});

