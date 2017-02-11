const uuid = require('uuid');

const initialize = function(sequelize, db){
  return db.define('organization', {
    id: {
      type: sequelize.UUID,
      primaryKey: true
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
    tableName: 'organizations',
    timestamps: false,
    hooks: {
      beforeUpdate: function(organization, options, done){
        organization.updated_at = Date.now();
        done();
      },
      beforeCreate: function(organization, options, done){
        organization.id = uuid.v4();
        organization.created_at = Date.now();
        organization.updated_at = Date.now();
        done();
      }
    }
  });
};

const model = {
  id: {
    reuqired: true,
    public: true
  },
  name: {
    required: true,
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