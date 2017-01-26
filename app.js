const express       = require('express');
const bodyParser    = require('body-parser');
const authorizer    = require('./lib/auth.js');
const db            = require('./db.js');
const controllers   = require('./controllers');

function start(config, cb){

  db.init(config.get('db').connection, function(err, models){

    var router = express.Router();

    router.post('/login', function(req, res) {
      controllers.auth.login(models, req, res);
    });

    router.post('/signup', function(req, res) {
      controllers.user.create(models, req, res);
    });

    router.post('/organizations', function(req, res){
      controllers.organization.create(models, req, res);
    });
    
    router.get('/users', function(req, res){
      controllers.user.list(models, req, res);
    });

    router.get('/users/:id', function(req, res){
      controllers.user.get(models, req, res);
    });

    router.post('/templates', function(req, res){
      controllers.template.create(models, req, res);
    });

    router.get('/templates', function(req, res){
      controllers.template.list(models, req, res);
    });

    router.get('/templates/:id', function(req, res){
      controllers.template.get(models, req, res);
    });

    router.get('/templates/:id/users', function(req, res){
      controllers.template.users(models, req, res);
    });

    router.put('/templates/:id', function(req, res){
      controllers.template.update(models, req, res);
    });

    router.delete('/templates/:id', function(req, res){
      controllers.template.delete(models, req, res);
    });

    var app = express();

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, api-key, session-key, admin-key, Access-Control-Allow-Credentials');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
    app.use(function(req, res, next){
      // authenticate
      req.session = {
        user_id: '123',
        organization_id: '123'
      };
      next();
    });
    app.use(authorizer({
      getPermissionsForEntity: function(user, id, cb){
        cb(null, ['read']);
      }
    }));
    app.use('/api', router);
    app.listen(config.get('api').port, cb);
  });
}

module.exports = {start};