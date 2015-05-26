var _ = require('lodash');
var pkg = require('../package.json');


function globalOptionsUsage() {
  return [
    'Global Options:'.underline.bold,
    '',
    '-c, --confdir    Optional path to alternative config dir.',
    '-v, --version    Show version.',
    '--no-colors      Disable pretty colours in output.'
  ].join('\n');
}


exports.fn = function (topic, cb) {

  var couchmin = this;


  function commandUsage(cmd, showDescription) {
    var fn = couchmin[cmd];
    var str = cmd;

    if (fn.args && fn.args.length) {
      fn.args.forEach(function (arg) {
        str += (arg.required) ? ' <' + arg.name + '>' : ' [ <' + arg.name + '> ]';
      });
    }

    if (showDescription) {
      str += '\n  ' + fn.description;
    }

    return str;
  }


  if (topic) {
    var topicCommand = couchmin[topic];
    if (!_.isFunction(topicCommand.fn)) {
      return cb(new Error('Unknown help topic: ' + topic));
    }

    console.log(('Usage: ' + pkg.name + ' ' +  commandUsage(topic)).bold, '\n');
    console.log((topicCommand.description || 'No description available') + '\n');
    if (topicCommand.args && topicCommand.args.length) {
      console.log('Arguments:'.bold.underline + '\n');
      topicCommand.args.forEach(function (arg) {
        var description = arg.description || 'No description available';
        console.log(arg.name.bold + ' ' + (arg.required ? '[Required]' : '[Optional]').grey);
        console.log('  ' + description + '\n');
      });
    }
    if (topicCommand.options && topicCommand.options.length) {
      console.log('Options:'.bold.underline + '\n');
      topicCommand.options.forEach(function (opt) {
        var description = opt.description || 'No description available';
        console.log(('--' + opt.name + ', -' + opt.shortcut).bold);
        console.log('  ' + description + '\n');
      });
    }
    console.log(globalOptionsUsage());
    return cb();
  }

  console.log(('Usage: ' + pkg.name + ' [ options ] <command>').bold + '\n');
  console.log('Commands:'.bold.underline + '\n');
  Object.keys(couchmin).forEach(function (key) {
    if (!_.isFunction(couchmin[key].fn)) { return; }
    console.log(commandUsage(key, true) + '\n');
  });
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

