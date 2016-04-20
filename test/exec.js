'use strict';


const Os = require('os');
const Path = require('path');
const ChildProcess = require('child_process');
const _ = require('lodash');


const internals = {
  confdir: Path.join(Os.tmpdir(), 'couchmin'),
  bin: Path.join(__dirname, '../bin/cli.js')
};


module.exports = function (args, options, cb) {

  if (arguments.length === 2) {
    cb = options;
    options = {};
  }

  options.env = _.extend({}, process.env, { HOME: internals.confdir }, options.env);
  args = args || [];
  args.push('--disable-updates');
  ChildProcess.execFile(internals.bin, args, options, cb);
};

module.exports.confdir = internals.confdir;

