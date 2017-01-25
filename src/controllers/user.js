const uuid = require('node-uuid');
const validation = require('../lib/validation');

module.exports = {
  create: function(db, req, res){

    var fields = ['email', 'name', 'password'];
    var args = {};
    for(var i = 0 ; i < fields.length ; i++){
      var field = fields[i];
      if(field){
        args[field] = req.body[field];
      }
    }

    db.user.connection
      .create({
        email: args.email,
        name: args.name,
        password_hash: args.password
      })
      .then(function(newUser){
        var responseUser = new validation(newUser.get({
          plain: true
        }), db.user.model);
        res.json(responseUser.sanitize());
      })
      .catch(function(err){
        res.status(500).send({
          errors: err.errors  
        });
      });
  }
};