var app = require('./src/app.js');
var config = require('./config/config.json');

app.start(config, function(err){
  if(err){
    console.log(err);
  }
  console.log('Magic happens on port ' + config.api.port);
});