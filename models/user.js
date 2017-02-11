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
    },
    job: {
      type: sequelize.STRING
    },
    created_at: {
      type: sequelize.DATE
    },
    updated_at: {
      type: sequelize.DATE
    }
  }, {
    tableName: 'users',
    timestamps: false,
    hooks: {
      beforeUpdate: function(user, options, done){
        // user.updated_at = sequelize.NOW();
        done();
      },
      beforeCreate: function(user, options, done){
        user.id = uuid.v4();
        // user.created_at = sequelize.NOW();
        // user.updated_at = sequelize.NOW();
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
  job: {
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