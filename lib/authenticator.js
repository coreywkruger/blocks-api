const encryption = require('./encryption');
const async = require('async');

module.exports = function(db, config){
  return function(req, res, next){
    
    req.session = {};
    var session = req.headers['blocks-session'];

    encryption
      .decryptSymmetric(config.private_key, session)
      .then(function(token){
        if(token === null){
          throw({
            status: 400,
            errors: ['You are not authenticated.']
          });
          return null;
        }
        if(Date.now() - token.timestamp < 1000 * 60 * 60){
          throw({
            status: 403,
            errors: ['Your session has expired.']
          });
          return null;
        }
        return token;
      })
      .then(function(token){
        return db.organization.connection
          .findOne({
            id: token.organization_id
          })
          .then(function(organization){
            if(organization === null){
              throw({
                status: 403,
                errors: ['Invalid session.']
              });
              return null;
            }
            req.session.organization_id = organization.id;
            return token;
          });
      })
      .then(function(token){
        return db.user.connection
          .findOne({
            id: token.user_id
          })
          .then(function(user){
            if(user === null){
              throw({
                status: 403,
                errors: ['Invalid session..']
              });
              return null;
            }
            req.session.user_id = user.id;
          });
      })
      .then(function(){
        // done authenticating
        next();
      })
      .catch(function(err){
        var status = err.status || 500;
        var errors = err.errors || err;
        return res.status(status).send({
          errors: errors
        });
      });
  }
};