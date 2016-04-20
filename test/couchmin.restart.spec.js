'use strict';


const Assert = require('assert');
const Exec = require('./exec');


describe('couchmin restart', () => {

  it.skip('should ...', (done) => {

    Exec(['restart'], (err, stdout, stderr) => {

      Assert.ok(!err);
      done();
    });
  });

});

