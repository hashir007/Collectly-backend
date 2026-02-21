'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  class Pools extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here   
      Pools.belongsTo(models.PoolsTypes, {
        foreignKey: "type"
      });
      Pools.belongsTo(models.User, {
        foreignKey: 'ownerID',
        as: 'poolOwner'
      });
      Pools.belongsTo(models.PoolsFormats, {
        foreignKey: "format"
      });
      Pools.hasMany(models.PoolsMembers, {
        foreignKey: "poolID",
        as: 'poolMembers'
      });
      Pools.hasMany(models.PoolsPayments, {
        foreignKey: "poolID"
      });
      Pools.hasMany(models.PoolsSettings, {
        foreignKey: "poolID",
        as: 'settings'
      });
      Pools.hasMany(models.PoolsMessages, {
        foreignKey: "poolID"
      });
      Pools.hasMany(models.PoolsPermissions, {
        foreignKey: "poolID",
        as: 'permissions'
      });
      Pools.belongsTo(models.PoolsEvents, {
        foreignKey: "PoolEventID"
      });
      Pools.hasMany(models.PoolJoinRequests, {
        foreignKey: "poolID"
      });

      Pools.hasMany(models.PoolPayouts, {
        foreignKey: "poolID"
      });

      Pools.hasOne(models.PoolVotingSettings, {
        foreignKey: "poolID",
        as: 'votingSettings'
      });

      Pools.hasOne(models.PoolPayoutSettings, {
        foreignKey: "poolID",
        as: 'payoutSettings'
      });

      Pools.hasMany(models.PoolReport, {
        foreignKey: "poolID"
      });

    }
  }

  Pools.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    name: DataTypes.STRING,
    type: DataTypes.INTEGER,
    format: DataTypes.INTEGER,
    defaultBuy_in_amount: DataTypes.DECIMAL(18, 2),
    goal_amount: DataTypes.DECIMAL(18, 2),
    status: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
    ownerID: DataTypes.INTEGER,
    description: DataTypes.TEXT,
    photo_id: DataTypes.INTEGER,
    group: DataTypes.UUID,
    PoolEventID: DataTypes.INTEGER,
    is_private: DataTypes.BOOLEAN,
    isArchive: DataTypes.BOOLEAN,
    is_goal_achieved: DataTypes.BOOLEAN,
    total_contributed: DataTypes.DECIMAL(18, 2),
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
          table_name: "pools",
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
          table_name: "pools",
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
          table_name: "pools",
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
    modelName: 'Pools',
    freezeTableName: true,
    tableName: 'pools'
  });
  return Pools;
};