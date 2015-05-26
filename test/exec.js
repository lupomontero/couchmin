var cp = require('child_process');
var path = require('path');
var _ = require('lodash');
var confdir = path.join(require('os').tmpdir(), 'couchmin');
var bin = path.join(__dirname, '../bin/cli.js');

module.exports = function (args, options, cb) {
  if (arguments.length === 2) {
    cb = options;
    options = {};
  }

  options.env = _.extend({}, process.env, { HOME: confdir }, options.env);
  cp.execFile(bin, args, options, cb);
};

module.exports.confdir = confdir;

