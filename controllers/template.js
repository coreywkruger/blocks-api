const uuid = require('node-uuid');
const _ = require('lodash');
const validation = require('../lib/validation');

module.exports = {

  create: function(db, req, res){

    var args = _.pick(req.body, [
      'content', 
      'name'
    ]);

    db.template.connection
      .create({
        organization_id: req.session.organization_id,
        content: args.content,
        name: args.name
      })
      .then(function(template){
        var response = new validation(template.get({
          plain: true
        }), db.template.model);
        res.json(response.sanitize());
      })
      .catch(function(err){
        res.status(500).send({
          errors: err.errors  
        });
      });
  },

  list: function(db, req, res){
    db.template.connection
      .find({
        organization_id: req.session.organization_id,
      })
      .then(function(recs){
        recs.forEach(function(rec){
          (new validation(rec.get({
            plain: true
          }), db.template.model)).sanitize();
        });
        res.json(recs);
      })
      .catch(function(err){
        res.status(500).send({
          errors: err.errors  
        });
      });
  },

  get: function(db, req, res){
    db.template.connection
      .findOne({
        organization_id: req.session.organization_id,
        id: req.params.id
      })
      .then(function(recs){
        recs.forEach(function(rec){
          (new validation(rec.get({
            plain: true
          }), db.template.model)).sanitize();
        });
        res.json(recs);
      })
      .catch(function(err){
        res.status(500).send({
          errors: err.errors  
        });
      });
  },

  update: function(db, req, res){

    var args = _.pick(req.body, [
      'content', 
      'name'
    ]);

    db.template.connection
      .query(`
      UPDATE templates as t 
        SET 
          t.content = COALESCE(:content, t.content),
          t.name = COALESCE(:name, t.name)
        WHERE 
          t.organization_id = :organization_id,
          t.id = :id;`, 
      {
        replacements: {
          organization_id: req.session.organization_id,
          id: req.params.id,
          content: args.content,
          name: args.name
        }
      })
      .then(function(template){
        var response = new validation(template.get({
          plain: true
        }), db.template.model);
        res.json(response.sanitize());
      })
      .catch(function(err){
        res.status(500).send({
          errors: err.errors  
        });
      });
  },

  users: function(db, req, res){

    var id = req.params.id;
    
    db.template.connection
      .findOne({
        organization_id: req.session.organization_id,
        id: req.params.id
      })
      .then(function(rec){
        return req.authorizer.getOwners(rec.id).then(function(users){
          users.forEach(function(rec){
            (new validation(rec.get({
              plain: true
            }), db.user.model)).sanitize();
          });
          res.json(users);
        })
        .catch(function(err){
          res.status(500).send({
            errors: err.errors  
          });
        });;
      })
      .catch(function(err){
        res.status(500).send({
          errors: err.errors  
        });
      });
  }
};