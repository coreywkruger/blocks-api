var express       = require('express');
var bodyParser    = require('body-parser');
var db            = require('./db.js');
var controllers   = require('./controllers');

function start(config, cb){

  db.init(config.db.connection, function(err, models){

    var router = express.Router();
    
    router.post('/user', function(req, res) {
      controllers.user.create(models, req, res);
    });

    router.get('/login', function(req, res) {
      res.json({ message: 'hooray! welcome to our api!' });
    });

    router.get('/signup', function(req, res) {
      res.json({ message: 'hooray! welcome to our api!' });   
    });
    
    var app = express();

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use('/api', router);
    app.listen(config.api.port, cb);
  });
}

module.exports = {start};