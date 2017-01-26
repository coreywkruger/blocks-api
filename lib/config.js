const path = require('path');
const nconf = require('nconf');

module.exports = function(location, cb) {
  var root = process.cwd();
  nconf.set('root', root);
  nconf.argv().env().use('memory');
  try {
    nconf.file(path.resolve(root, location));
    cb(null, nconf);
  } catch (err) {
    cb(err);
  }
  return nconf;
};