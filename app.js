const express       = require('express');
const bodyParser    = require('body-parser');
const authorizer    = require('./lib/authorizer');
const authenticator = require('./lib/authenticator');
const db            = require('./db');
const controllers   = require('./controllers');
const permissions   = require('blocks-permissions');

function start(config, cb){

  db.init(config.get('db').connection, function(err, models){

    var publicRouter = express.Router();

    publicRouter.post('/login', function(req, res) {
      controllers.auth.login(models, req, res, config.get('api'));
    });

    publicRouter.post('/login/:organization_id', function(req, res) {
      controllers.auth.loginTeam(models, req, res, config.get('api'));
    });

    publicRouter.post('/signup', function(req, res) {
      controllers.auth.signup(models, req, res, config.get('api'));
    });

    publicRouter.post('/join-team', function(req, res) {
      controllers.auth.joinTeam(models, req, res, config.get('api'));
    });

    var privateRouter = express.Router();

    privateRouter.post('/invite/:template_id', function(req, res) {
      controllers.auth.invite(models, req, res, config.get('signup'));
    });

    privateRouter.post('/organizations', function(req, res){
      controllers.organization.create(models, req, res);
    });
    
    privateRouter.get('/users', function(req, res){
      controllers.user.list(models, req, res);
    });

    privateRouter.get('/users/:id', function(req, res){
      controllers.user.get(models, req, res);
    });

    privateRouter.post('/templates', function(req, res){
      controllers.template.create(models, req, res);
    });

    privateRouter.get('/templates', function(req, res){
      controllers.template.list(models, req, res);
    });

    privateRouter.get('/templates/:id', function(req, res){
      controllers.template.get(models, req, res);
    });

    privateRouter.get('/templates/:id/users', function(req, res){
      controllers.template.users(models, req, res);
    });

    privateRouter.put('/templates/:id', function(req, res){
      controllers.template.update(models, req, res);
    });

    privateRouter.delete('/templates/:id', function(req, res){
      controllers.template.delete(models, req, res);
    });

    var app = express();

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Access-Control-Allow-Credentials, blocks-session');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
    app.use(function(req, res, next){
      console.log(req.method, req.hostname, req.path);
      next();
    });
    app.use(function(req, res, next){
      permissions.initialize({
        database: config.get('db').connection
      }, function(err, permissionsService){
        if(err){
          next(err);
        }
        req.permissions = permissionsService;
        next();
      });
    });
    app.use('/api', publicRouter);
    app.use(authenticator(models, config.get('api')));
    app.use(authorizer);
    app.use('/api', privateRouter);
    app.listen(config.get('api').port, cb);
  });
}

module.exports = {start};