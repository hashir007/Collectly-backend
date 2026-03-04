'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolsEventTips extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PoolsEventTips.belongsTo(models.PoolsEvents, {
        foreignKey: "eventId"
      });
      PoolsEventTips.belongsTo(models.User, {
        foreignKey: "userId"
      });
    }
  }
  PoolsEventTips.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: {
      type: DataTypes.INTEGER
    },
    status: {
      type: DataTypes.STRING
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2)
    },
    eventId: {
      type: DataTypes.INTEGER
    },
    response: {
      type: DataTypes.TEXT
    },
    transaction_id: {
      type: 'NVARCHAR(300)'
    },
    source: { type: 'NVARCHAR(100)' },
    order_id: DataTypes.STRING,
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'PoolsEventTips',
    freezeTableName: true,
    tableName: 'pools_event_tips'
  });
  return PoolsEventTips;
};