'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolsMessages extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PoolsMessages.belongsTo(models.Pools, {
        foreignKey: "poolID"
      });
      PoolsMessages.belongsTo(models.PoolsEvents, {
        foreignKey: "eventID"
      });
      PoolsMessages.belongsTo(models.User, {
        foreignKey: "createdBy",
        as: 'createdByUser'
      });
      PoolsMessages.belongsTo(models.User, {
        foreignKey: "modifiedBy",
        as: 'modifiedByUser'
      });
    }
  }
  PoolsMessages.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    poolID: DataTypes.INTEGER,
    eventID: DataTypes.INTEGER,
    message: {
      type: DataTypes.TEXT
    },
    createdBy: {
      type: DataTypes.INTEGER
    },
    modifiedBy: {
      type: DataTypes.INTEGER
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }

  }, {
    hooks: {
      afterCreate: function (model, options) {
        var action = "create";
        var auditLog = sequelize.models.EventLog.build({
          source_type: 'users', // 'server', 'users'
          source_id: model.createdBy, // NULL (server), user.id
          table_name: "pools_messages",
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
          table_name: "pools_messages",
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
          table_name: "pools_messages",
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
    modelName: 'PoolsMessages',
    freezeTableName: true,
    tableName: 'pools_messages'
  });
  return PoolsMessages;
};