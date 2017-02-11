const uuid = require('uuid');

const initialize = function(sequelize, db){
  return db.define('template', {
    id: {
      type: sequelize.UUID,
      primaryKey: true
    },
    organization_id: {
      type: sequelize.UUID
    },
    name: {
      type: sequelize.STRING
    },
    content: {
      type: sequelize.TEXT
    },
    created_at: {
      type: sequelize.DATE,
      defaultValue: sequelize.NOW
    },
    updated_at: {
      type: sequelize.DATE,
      defaultValue: sequelize.NOW
    }
  }, {
    tableName: 'templates',
    timestamps: false,
    hooks: {
      beforeUpdate: function(template, options, done){
        template.updated_at = sequelize.NOW();
        done();
      },
      beforeCreate: function(template, options, done){
        template.id = uuid.v4();
        done();
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
  name: {
    required: false,
    public: true
  },
  content: {
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