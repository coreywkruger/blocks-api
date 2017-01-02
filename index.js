var app = require('./src/app.js');
var PORT = process.env.PORT;

app.start(PORT, function(err){
  if(err){
    console.log(err);
  }
  console.log('Magic happens on port ' + PORT);
});