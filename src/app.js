var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');

function start(port, cb){
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  var router = express.Router();

  // router.get('/', function(req, res) {
  //     res.json({ message: 'hooray! welcome to our api!' });   
  // });

  router.get('/signup', function(req, res) {
      res.json({ message: 'hooray! welcome to our api!' });   
  });

  router.get('/login', function(req, res) {
      res.json({ message: 'hooray! welcome to our api!' });   
  });

  router.get('/', function(req, res) {
      res.json({ message: 'hooray! welcome to our api!' });   
  });

  app.use('/api', router);

  app.listen(port, cb);
}

module.exports = {start};