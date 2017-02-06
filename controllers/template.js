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

        req.authorizer.authorize(req.session.user_id, template.id, [
          'template.create',
          'template.read',
          'template.update',
          'template.delete',
        ], function(err){

          if(err){
            return res.status(500).send({
              errors: err  
            });
          }

          var response = new validation(template.get({
            plain: true
          }), db.template.model);
          res.json(response.sanitize());
        });
      })
      .catch(function(err){
        res.status(500).send({
          errors: err  
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
        recs = _.map(recs, function(rec){
          var recPlain = rec.get({
            plain: true
          });
          var response = (new validation(recPlain, db.template.model)).sanitize();
          delete response.content;
          return response;
        });
        res.json(recs);
      })
      .catch(function(err){
        res.status(500).send({
          errors: err  
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
            errors: err  
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
        UPDATE templates
          SET 
            content = COALESCE(:content, content),
            name = COALESCE(:name, name)
          WHERE 
            :organization_id = organization_id AND
            :id = id;`, 
        {
          replacements: {
            organization_id: req.session.organization_id,
            id: req.params.id,
            content: args.content || null,
            name: args.name || null
          }
        })
        .then(function(template){
          res.json({
            success: true  
          });
        })
        .catch(function(err){
          res.status(500).send({
            errors: err  
          });
        });
    });
  },

  delete: function(db, req, res){

    if(!req.authorizer.isAllowed('template.delete')){
      return res.status(403).send({
        errors: ['You do not have permission to do this.']
      })
    }

    req.authorizer.owns('template.delete', req.session.user_id, req.params.id, function(err, owns){
      if(!owns || err){
        return res.status(403).send({
          errors: ['You do not own this resource.']
        });
      }

      db.template.connection
        .destroy({
          where: {
            id: req.params.id
          }
        })
        .then(function(success){
          res.json({
            sucess: true
          })
        })
        .catch(function(err){
          res.status(500).send({
            errors: err  
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
    
    req.authorizer.getOwners(id, 'template.update', function(err, userIds){
      if(err){
        return res.status(500).send({
          errors: err
        });
      }
      
      userIds = _.map(userIds, function(userId){
        return userId.entity_id;
      });

      db.sequelize.query(`
      SELECT * FROM users
      WHERE id in (:userIds)
      `, {
        replacements: {
          userIds: userIds
        },
        type: db.sequelize.QueryTypes.SELECT
      })
      .catch(function(err){
        return res.status(500).send({
          errors: err
        })
      })
      .then(function(recs){
        recs = _.map(recs, function(rec){
          var response = (new validation(rec, db.user.model)).sanitize();
          return response;
        });
        res.json(recs);
      })
    });
  }
};