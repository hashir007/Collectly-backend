'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubscriptionsPayments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SubscriptionsPayments.belongsTo(models.User,{
        foreignKey: "userId"
      });      
    }
  }
  SubscriptionsPayments.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    subscriptionId: {
      type: DataTypes.STRING
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
    total_amount: {
      type: DataTypes.DECIMAL(18, 2)
    },
    userId: {
      type: DataTypes.INTEGER
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
    modelName: 'SubscriptionsPayments',
    freezeTableName: true,
    tableName: 'subscriptions_payments'
  });
  return SubscriptionsPayments;
};