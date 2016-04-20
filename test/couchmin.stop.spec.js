'use strict';


const Assert = require('assert');
const Exec = require('./exec');


describe('couchmin stop', () => {

  it.skip('should ...', (done) => {

    Exec(['stop'], (err, stdout, stderr) => {

      Assert.ok(!err);
      done();
    });
  });

});

