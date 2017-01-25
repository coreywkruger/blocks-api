const initialize = function(sequelize, db){
  return db.define('organization', {
    id: {
      type: sequelize.UUID,
      primaryKey: true
    },
    name: {
      type: sequelize.STRING
    }
  }, {
    tableName: 'organizations',
    timestamps: false
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
  }
};

module.exports = {
  initialize,
  model
};