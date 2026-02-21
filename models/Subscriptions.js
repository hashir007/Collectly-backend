'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Subscriptions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Subscriptions.belongsTo(models.User, {
        foreignKey: "userId"
      });
      Subscriptions.belongsTo(models.PoolsPlans, {
        foreignKey: "planId"
      });
    }
  }
  Subscriptions.init({
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
    userId: {
      type: DataTypes.INTEGER
    },
    subscription_renewal_amount: {
      type: DataTypes.DECIMAL(18, 2)
    },
    status: {
      type: DataTypes.STRING
    },
    startDate: {
      type: DataTypes.DATE
    },
    endDate: {
      type: DataTypes.DATE
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
    modelName: 'Subscriptions',
    freezeTableName: true,
    tableName: 'subscriptions'
  });
  return Subscriptions;
};