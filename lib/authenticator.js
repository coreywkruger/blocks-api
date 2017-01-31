const encryption = require('./encryption');
const async = require('async');

module.exports = function(db, config){
  return function(req, res, next){
    
    req.session = {};
    var session = req.headers['blocks-session'];

    encryption
      .decryptSymmetric(config.private_key, session)
      .catch(function(err){
        return res.status(402).send({
          errors: ['Your token is malformed']
        });
      })
      .then(function(token){
        
        if(token === null){
          return res.status(402).send({
            errors: ['You are not authenticated.']
          });
        }

        if(Date.now() - token.timestamp < 1000 * 60 * 60){
          return res.status(402).send({
            errors: ['Your session has expired.']
          });
        }

        async.waterfall([
          function(done){
            db.organization.connection
              .findOne({
                id: token.organization_id
              })
              .then(function(organization){
                if(organization === null){
                  return res.status(402).send({
                    errors: ['Invalid session.']
                  });
                }
                req.session.organization_id = organization.id;
                done();
              })
              .catch(done);
          }, 
          function(done){
            db.user.connection
              .findOne({
                id: token.user_id
              })
              .then(function(user){
                if(user === null){
                  return res.status(402).send({
                    errors: ['Invalid session..']
                  });
                }
                req.session.user_id = user.id;
                done();
              })
              .catch(done);
          }
        ], function(err, result){
          if(err){
            return res.status(402).send({
              errors: ['Invalid session...']
            });
          }
          next();
        });
      });
  }
};