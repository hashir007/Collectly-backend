'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolsPayments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PoolsPayments.belongsTo(models.User, {
        foreignKey: "memberID"
      });
      PoolsPayments.belongsTo(models.Pools, {
        foreignKey: "poolID"
      });
    }
  }
  PoolsPayments.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    memberID: DataTypes.INTEGER,
    response: DataTypes.TEXT,
    status: DataTypes.STRING,
    amount: DataTypes.DECIMAL(18, 2),
    poolID: DataTypes.INTEGER,
    transaction_id: {
      type: 'NVARCHAR(300)'
    },
    serviceChargePercentage: DataTypes.DECIMAL(18, 2),
    source: { type: 'NVARCHAR(100)' },
    order_id: DataTypes.STRING,
    discount: DataTypes.DECIMAL(18, 2),
    total: DataTypes.DECIMAL(18, 2),
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
          table_name: "pools_payments",
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
          table_name: "pools_payments",
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
          table_name: "pools_payments",
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
    modelName: 'PoolsPayments',
    freezeTableName: true,
    tableName: 'pools_payments'
  });
  return PoolsPayments;
};