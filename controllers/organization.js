const uuid = require('node-uuid');
const _ = require('lodash');
const validation = require('../lib/validation');

module.exports = {
  create: function(db, req, res){

    var args = _.pick(req.body, ['name']);

    db.organization.connection
      .create({
        name: args.name
      })
      .then(function(organization){
        if(rec === null){
          return res.status(404).send({
            errors: ['Not Found'] 
          });
        }
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