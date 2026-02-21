'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolsTypes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here     
      PoolsTypes.hasOne(models.Pools,{
        foreignKey: "type"
      }); 
      PoolsTypes.hasOne(models.PoolsTypesAvaliableFormats,{
        foreignKey: "pools_typesID"
      }); 
    }
  }
  PoolsTypes.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    name: DataTypes.STRING,
    subName:DataTypes.STRING,
  }, {
    hooks: {
      afterCreate: function (model, options) {
        var action = "create";        
        var auditLog = sequelize.models.EventLog.build({
          source_type: 'users', // 'server', 'users'
          source_id: model.createdBy, // NULL (server), user.id
          table_name: "pools_types",
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
          table_name: "pools_types",
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
          table_name: "pools_types",
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
    modelName: 'PoolsTypes',
    timestamps: false,
    freezeTableName: true,
    tableName: 'pools_types'
  });
  return PoolsTypes;
};