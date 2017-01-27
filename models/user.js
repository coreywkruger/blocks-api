const bcrypt = require('bcrypt');
const async = require('async');
const uuid = require('node-uuid');

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
    },
    created_at: {
      type: sequelize.BIGINT
    },
    updated_at: {
      type: sequelize.BIGINT
    }
  }, {
    tableName: 'users',
    timestamps: false,
    hooks: {
      beforeUpdate: function(user, options, done){
        user.updated_at = Date.now();
        done();
      },
      beforeCreate: function(user, options, done){
        user.id = uuid.v4();
        user.created_at = Date.now();
        user.updated_at = Date.now();
        if(user.password_hash){
          bcrypt.hash(user.password_hash, 10, function(err, hash){
            if(err){
              return done(err);
            }
            user.password_hash = hash;
            done();
          });
        } else {
          done();
        }
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
  },
  created_at: {
    required: false,
    public: true
  },
  updated_at: {
    required: false,
    public: true
  }
};

module.exports = {
  initialize,
  model
};