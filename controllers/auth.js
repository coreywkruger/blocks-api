const uuid = require('node-uuid');
const _ = require('lodash');
const bcrypt = require('bcrypt');
const validation = require('../lib/validation');

module.exports = {

  login: function(db, req, res){

    var args = _.pick(req.body, [
      'email', 
      'password'
    ]);

    db.user.connection
      .findOne({
        email: args.email
      })
      .then(function(rec){
        if(rec === null){
          return res.status(404).send({
            errors: ['Not Found'] 
          });
        }
        bcrypt.compare(args.password, rec.password_hash, function(err, match){
          if(err || !match){
            return res.status(401).send({
              errors: ['incorrect password']
            });
          }
          return res.json({
            'session': 'some special session key'
          });
        });
      })
      .catch(function(err){
        return res.status(500).send({
          errors: err  
        });
      });
  }
};