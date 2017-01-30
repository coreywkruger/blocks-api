const async = require('async');
const configLoader = require('./lib/config');
const Sequelize = require('sequelize');
const fs = require('fs');

const clean = fs.readFileSync('./seed/clean.sql').toString();
const schemas = 
  fs.readFileSync('./seed/schemas.sql').toString();
const permissions_seed = 
  fs.readFileSync('./seed/permissions_seed.sql').toString();
const roles_seed = 
  fs.readFileSync('./seed/roles_seed.sql').toString();
const role_permissions_seed = 
  fs.readFileSync('./seed/role_permissions_seed.sql').toString();
const entity_roles_seed = 
  fs.readFileSync('./seed/entity_roles_seed.sql').toString();
const users_seed = 
  fs.readFileSync('./seed/users_seed.sql').toString();
const organizations_seed = 
  fs.readFileSync('./seed/organizations_seed.sql').toString();
const templates_seed = 
  fs.readFileSync('./seed/templates_seed.sql').toString();
const entity_permissions_seed = 
  fs.readFileSync('./seed/entity_permissions_seed.sql').toString();

(function(configLocation){
  // load config
  configLoader(configLocation, function(err, config){
    if(err){
      console.log('failed to migrate');
      console.log(err);
      process.exit(1);
    }
    sequelize = new Sequelize(config.get('db').connection, {});
    sequelize.drop({}).then(function(){
    async.waterfall([
      function(done){
        sequelize.query(clean)
          .then(function(res){
            done();
          })
          .catch(done);
      }, function(done){
        sequelize.query(schemas)
          .then(function(res){
            done();
          })
          .catch(done);
      }, function(done){
        sequelize.query(permissions_seed)
          .then(function(res){
            done();
          })
          .catch(done);
      }, function(done){
        sequelize.query(roles_seed)
          .then(function(res){
            done();
          })
          .catch(done);
      }, function(done){
        sequelize.query(role_permissions_seed)
          .then(function(res){
            done();
          })
          .catch(done);
      }, function(done){
        sequelize.query(entity_roles_seed)
          .then(function(res){
            done();
          })
          .catch(done);
      }, function(done){
        sequelize.query(users_seed)
          .then(function(res){
            done();
          })
          .catch(done);
      }, function(done){
        sequelize.query(organizations_seed)
          .then(function(res){
            done();
          })
          .catch(done);
      }, function(done){
        sequelize.query(templates_seed)
          .then(function(res){
            done();
          })
          .catch(done);
      }, function(done){
        sequelize.query(entity_permissions_seed)
          .then(function(res){
            done();
          })
          .catch(done);
      }
    ], function(err){
      if(err){
        console.log('failed to migrate');
        console.log(err);
        process.exit(1);
      }
      console.log('successfully migrated');
      process.exit();
    });
    });
  });
})(process.env.CONFIG);