const sequelize = require('sequelize');
const models = require('./models');

function init(connection, cb){
  var db = new sequelize(connection, {
    logging: false
  });
  var collection = {};
  for(var key in models){
    collection[key] = {
      connection: models[key].initialize(sequelize, db),
      model: models[key].model
    };
  }
  db.sync({ force: true })
    .then(function(err){
      cb(err, collection);
    });
}

module.exports = {init};