const uuid = require('node-uuid');
const _ = require('lodash');
const validation = require('../lib/validation');

module.exports = {

  create: function(db, req, res){
    
    if(!req.authorizer.isAllowed('write')){
      return res.status(403).send({
        errors: ['You do not have permission to do this.']
      })
    }

    var args = _.pick(req.body, [
      'email', 
      'name', 
      'password'
    ]);

    db.user.connection
      .create({
        id: uuid.v4(),
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
    
    if(!req.authorizer.isAllowed('read')){
      return res.status(403).send({
        errors: ['You do not have permission to do this.']
      })
    }

    db.user.connection
      .findOne({
        where: {
          organization_id: req.session.organization_id,
          id: req.params.id
        }
      })
      .then(function(rec){
        if(rec === null){
          return res.status(404).send({
            errors: ['Not Found']
          });
        }
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

    if(!req.authorizer.isAllowed('read')){
      return res.status(403).send({
        errors: ['You do not have permission to do this.']
      })
    }

    db.user.connection
      .findAll({
        where: {
          organization_id: req.session.organization_id,
        }
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
  }
};