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

    var args = _.pick(req.body, ['name']);

    db.organization.connection
      .create({
        id: req.session.organization_id,
        name: args.name
      })
      .then(function(organization){
        var response = new validation(organization.get({
          plain: true
        }), db.organization.model);
        res.json(response.sanitize());
      })
      .catch(function(err){
        res.status(500).send({
          errors: err.errors  
        });
      });
  }
};