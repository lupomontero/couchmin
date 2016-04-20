'use strict';


const _ = require('lodash');
const Pkg = require('../package.json');


const globalOptionsUsage = function () {

  return [
    'Global Options:'.underline.bold,
    '',
    '-c, --confdir      Optional path to alternative config dir.',
    '-v, --version      Show version.',
    '--no-color         Disable pretty colours in output.',
    '--disable-updates  Do not check for ' + Pkg.name + ' updates.',
    ''
  ].join('\n');
};


exports.fn = function (topic, cb) {

  const self = this;


  const commandUsage = function (cmd, showDescription) {

    const fn = self[cmd];
    let str = cmd;

    if (fn.args && fn.args.length) {
      fn.args.forEach((arg) => {

        str += (arg.required) ? ' <' + arg.name + '>' : ' [ <' + arg.name + '> ]';
      });
    }

    if (showDescription) {
      str += '\n  ' + fn.description;
    }

    return str;
  };


  if (topic) {
    const topicCommand = self[topic];
    if (!_.isFunction(topicCommand.fn)) {
      return cb(new Error('Unknown help topic: ' + topic));
    }

    console.log(('Usage: ' + Pkg.name + ' ' +  commandUsage(topic)).bold, '\n');
    console.log((topicCommand.description || 'No description available') + '\n');
    if (topicCommand.args && topicCommand.args.length) {
      console.log('Arguments:'.bold.underline + '\n');
      topicCommand.args.forEach((arg) => {

        const description = arg.description || 'No description available';
        console.log(arg.name.bold + ' ' + (arg.required ? '[Required]' : '[Optional]').grey);
        console.log('  ' + description + '\n');
      });
    }
    if (topicCommand.options && topicCommand.options.length) {
      console.log('Options:'.bold.underline + '\n');
      topicCommand.options.forEach((opt) => {

        const description = opt.description || 'No description available';
        console.log(('--' + opt.name + ', -' + opt.shortcut).bold);
        console.log('  ' + description + '\n');
      });
    }
    console.log(globalOptionsUsage());
    return cb();
  }

  console.log(('Usage: ' + Pkg.name + ' [ options ] <command>').bold + '\n');
  console.log('Commands:'.bold.underline + '\n');
  Object.keys(self).forEach((key) => {

    if (!_.isFunction(self[key].fn)) {
      return;
    }
    console.log(commandUsage(key, true) + '\n');
  });
  console.log([
    'Command specific help:'.underline.bold,
    '',
    'Each command has it\'s own help text. Use `' + Pkg.name + ' help <cmd>`',
    'to display it. For example:',
    '',
    '  ' + Pkg.name + ' help ls',
    ''
  ].join('\n'));
  console.log(globalOptionsUsage());
  cb();

};

exports.description = 'Show help.';

exports.args = [
  {
    name: 'topic',
    required: false
  }
];

