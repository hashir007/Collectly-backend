'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Notifications extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Notifications.belongsTo(models.User, {
        foreignKey: 'userToNotify'
      });
    }
  }
  Notifications.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userToNotify: DataTypes.INTEGER,
    isRead: DataTypes.BOOLEAN,
    message: DataTypes.TEXT,
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE
    }
  }, {
    hooks: {
      afterCreate: function (model, options) {
        var action = "create";
        var auditLog = sequelize.models.EventLog.build({
          source_type: 'users', // 'server', 'users'
          source_id: model.createdBy, // NULL (server), user.id
          table_name: "notifications",
          table_row_id: model.get('id'),
          action: action,
          timestamp: new Date(),
          previous_values: {},
          current_values: model.dataValues,
          transaction_id: options.transaction ? options.transaction.id : null
        });
        return auditLog.save({ transaction: options.transaction });
      },
      afterUpdate: function (model, options) {
        var action = "update";
        var auditLog = sequelize.models.EventLog.build({
          source_type: 'users', // 'server', 'users'
          source_id: model.createdBy, // NULL (server), user.id
          table_name: "notifications",
          table_row_id: model.get('id'),
          action: action,
          timestamp: new Date(),
          previous_values: model._previousDataValues,
          current_values: model.dataValues,
          transaction_id: options.transaction ? options.transaction.id : null
        });
        return auditLog.save({ transaction: options.transaction });
      },
      afterDestroy: function (model, options) {
        var action = "delete";        
        var auditLog = sequelize.models.EventLog.build({
          source_type: 'users', // 'server', 'users'
          source_id: model.createdBy, // NULL (server), user.id
          table_name: "notifications",
          table_row_id: model.get('id'),
          action: action,
          timestamp: new Date(),
          previous_values: model._previousDataValues,
          current_values: model.dataValues,
          transaction_id: options.transaction ? options.transaction.id : null
        });
        return auditLog.save({ transaction: options.transaction });
      }
    },
    sequelize,
    modelName: 'Notifications',
    freezeTableName: true,
    tableName: 'notifications'
  });
  return Notifications;
};