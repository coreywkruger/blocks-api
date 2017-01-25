const bcrypt = require('bcrypt');
const async = require('async');
const uuid = require('uuid');

const initialize = function(sequelize, db){
  return db.define('user', {
    id: {
      type: sequelize.UUID,
      primaryKey: true
    },
    email: {
      type: sequelize.STRING,
      unique: true
    },
    password_hash: {
      type: sequelize.STRING
    },
    name: {
      type: sequelize.STRING
    }
  }, {
    tableName: 'users',
    timestamps: false,
    hooks: {
      beforeCreate: function(user, options, done){
        async.waterfall([
          function(next){
            user.id = uuid.v4();
            next();
          },
          function(next){
            if(user.password_hash){
              bcrypt.hash(user.password_hash, 10, function(err, hash){
                if(err){
                  return next(err);
                }
                user.password_hash = hash;
                next();
              });
            }
        }], done);
      }
    }
  });
};

const model = {
  id: {
    required: true,
    public: true
  },
  email: {
    required: true,
    public: true
  },
  password_hash: {
    required: false,
    public: false
  },
  name: {
    required: false,
    public: true
  }
};

module.exports = {
  initialize,
  model
};