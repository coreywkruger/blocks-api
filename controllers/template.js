const uuid = require('node-uuid');
const _ = require('lodash');
const validation = require('../lib/validation');

module.exports = {

  create: function(db, req, res){

    if(!req.authorizer.isAllowed('template.create')){
      return res.status(403).send({
        errors: ['You do not have permission to do this.']
      })
    }

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

    if(!req.authorizer.isAllowed('template.read')){
      return res.status(403).send({
        errors: ['You do not have permission to do this.']
      })
    }

    db.template.connection
      .findAll({
        where: {
          organization_id: req.session.organization_id
        }
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

    if(!req.authorizer.isAllowed('template.read')){
      return res.status(403).send({
        errors: ['You do not have permission to do this.']
      })
    }

    req.authorizer.owns('template.read', req.session.user_id, req.params.id, function(err, owns){
      if(!owns || err){
        return res.status(403).send({
          errors: ['You do not have permission to do this.']
        });
      }

      db.template.connection
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
          }), db.template.model);
          res.json(response.sanitize());
        })
        .catch(function(err){
          res.status(500).send({
            errors: err.errors  
          });
        });
    });
  },

  update: function(db, req, res){

    if(!req.authorizer.isAllowed('template.update')){
      return res.status(403).send({
        errors: ['You do not have permission to do this.']
      })
    }

    req.authorizer.owns('template.update', req.session.user_id, req.params.id, function(err, owns){
      if(!owns || err){
        return res.status(403).send({
          errors: ['You do not have permission to do this.']
        });
      }

      var args = _.pick(req.body, [
        'content',
        'name'
      ]);

      db.sequelize
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
    });
  },

  users: function(db, req, res){

    if(!req.authorizer.isAllowed('template.read')){
      return res.status(403).send({
        errors: ['You do not have permission to do this.']
      })
    }

    var id = req.params.id;
    
    req.authorizer.getOwners(id, 'template.update', function(err, users){
      if(err){
        return res.status(500).send({
          errors: err.errors  
        });
      }
      res.json(users);
    });
  }
};