const initialize = function(sequelize, db){
  var template = db.define('template', {
    id: {
      type: sequelize.UUID,
      primaryKey: true
    },
    name: {
      type: sequelize.STRING
    }
  }, {
    tableName: 'templates',
    timestamps: false
  });
};

const model = {
  id: {
    required: true,
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