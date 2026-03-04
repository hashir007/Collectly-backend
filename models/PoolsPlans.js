'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolsPlans extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here     
      PoolsPlans.hasMany(models.SubscriptionsHistories, {
        foreignKey: "planId"
      });    
      PoolsPlans.hasMany(models.Subscriptions, {
        foreignKey: "planId"
      });    
    }
  }
  PoolsPlans.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    type: DataTypes.STRING,
    price: DataTypes.DECIMAL(18, 2),
    paypalPlanId: DataTypes.STRING,
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
    modelName: 'PoolsPlans',
    timestamps: false,
    freezeTableName: true,
    tableName: 'pools_plans'
  });
  return PoolsPlans;
};