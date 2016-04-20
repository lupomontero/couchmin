'use strict';


const Assert = require('assert');
const Exec = require('./exec');


describe('couchmin pull', () => {

  it.skip('should ...', (done) => {

    Exec(['pull'], (err, stdout, stderr) => {

      Assert.ok(!err);
      done();
    });
  });

});

