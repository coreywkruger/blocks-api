const uuid = require('node-uuid');
const _ = require('lodash');
const validation = require('../lib/validation');

module.exports = {

  create: function(db, req, res){

    var args = _.pick(req.body, [
      'email', 
      'name', 
      'password'
    ]);

    db.user.connection
      .create({
        email: args.email,
        name: args.name,
        password_hash: args.password
      })
      .then(function(rec){
        var response = new validation(rec.get({
          plain: true
        }), db.user.model);
        res.json(response.sanitize());
      })
      .catch(function(err){
        res.status(500).send({
          errors: err.errors  
        });
      });
  },

  get: function(db, req, res){
    
    db.user.connection
      .find({
        organization_id: req.session.organization_id,
        id: req.params.id
      })
      .then(function(rec){
        var response = new validation(rec.get({
          plain: true
        }), db.user.model);
        res.json(rec.sanitize());
      })
      .catch(function(err){
        res.status(500).send({
          errors: err.errors  
        });
      });
  },

  list: function(db, req, res){
    if(req.authorizer.isAllowed('read')){
      db.user.connection
        .find({
          organization_id: req.session.organization_id,
        })
        .then(function(recs){
          recs.forEach(function(rec){
            (new validation(rec.get({
              plain: true
            }), db.user.model)).sanitize();
          });
          res.json(recs);
        })
        .catch(function(err){
          res.status(500).send({
            errors: err.errors  
          });
        });
    } else {
      res.status(403).send({
        errors: ['Not Authorized']
      });
    }
  }
};