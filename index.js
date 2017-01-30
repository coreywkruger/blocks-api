var app = require('./app.js');
var db = require('./db.js');
var configLoader = require('./lib/config');

(function(configLocation){
  // load config
  configLoader(configLocation, function(err, config){
    if(err){
      console.log('failed start');
      console.log(err);
      process.exit(1);
    }
    app.start(config, function(err){
      if(err){
        console.log('failed start');
        console.log(err);
        process.exit(1);
      }
      console.log('successfully started')
    });
  });
})(process.env.CONFIG);