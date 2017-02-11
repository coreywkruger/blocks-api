const uuid = require('uuid');

const initialize = function(sequelize, db){
  return db.define('membership', {
    id: {
      type: sequelize.UUID,
      primaryKey: true
    },
    organization_id: {
      type: sequelize.UUID
    },
    user_id: {
      type: sequelize.UUID
    }
  }, {
    tableName: 'memberships',
    timestamps: false,
    hooks: {
      beforeCreate: function(membership, options, done){
        membership.id = uuid.v4();
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
  organization_id: {
    required: true,
    public: true
  },
  user_id: {
    required: true,
    public: true
  }
};

module.exports = {
  initialize,
  model
};