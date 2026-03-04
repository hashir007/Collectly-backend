'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubscriptionsHistories extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SubscriptionsHistories.belongsTo(models.User, {
        foreignKey: "userId"
      });
      SubscriptionsHistories.belongsTo(models.PoolsPlans, {
        foreignKey: "planId"
      });
    }
  }
  SubscriptionsHistories.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    subscriptionId: {
      type: DataTypes.STRING
    },
    planId: {
      type: DataTypes.INTEGER
    },
    total_amount: {
      type: DataTypes.DECIMAL(18, 2)
    },
    resource_type: {
      type: DataTypes.STRING
    },
    event_type: {
      type: DataTypes.STRING
    },
    summary: {
      type: DataTypes.TEXT
    },
    userId: {
      type: DataTypes.INTEGER      
    },
    startDate: {
      type: DataTypes.DATE
    },
    endDate: {
      type: DataTypes.DATE
    },
    response: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.STRING
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
    sequelize,
    modelName: 'SubscriptionsHistories',
    freezeTableName: true,
    tableName: 'subscriptions_histories'
  });
  return SubscriptionsHistories;
};