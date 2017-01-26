const initialize = function(sequelize, db){
  var organizationUser = db.define('organization_user', {
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
    tableName: 'organization_users',
    timestamps: false,
    classMethods: {
      associate: function(models) {
        organizationUser.belongsTo(models.organization, {
          foreignKey: 'organization_id'
        });
        organizationUser.belongsTo(models.user, {
          foreignKey: 'user_id'
        });
      }
    }
  });
};

const model = {
  id: {
    required: true,
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