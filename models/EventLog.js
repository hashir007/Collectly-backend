'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class EventLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here      

    }
  }
  EventLog.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    source_type: {
      type: DataTypes.STRING(255), allowNull: false,
    },
    source_id: { type: DataTypes.UUID, allowNull: true },
    table_name: { type: DataTypes.STRING(255), allowNull: false },
    table_row_id: { type: DataTypes.UUID, allowNull: false },
    action: {
      type: DataTypes.STRING(32), allowNull: false
    },
    timestamp: { type: DataTypes.DATE, allowNull: false },
    previous_values: { type: DataTypes.JSON, allowNull: false },
    current_values: { type: DataTypes.JSON, allowNull: false },
    transaction_id: {     
      type: DataTypes.UUID, allowNull: true      
    }

  }, {
    sequelize,
    modelName: 'EventLog',
    timestamps: false,
    freezeTableName: true,
    tableName: 'event_logs'
  });
  return EventLog;
};