'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolPayoutSettings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PoolPayoutSettings.belongsTo(models.Pools, { foreignKey: 'poolID', as:'pool' });
    }
  }
  PoolPayoutSettings.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    poolID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'pools',
        key: 'id'
      }
    },
    max_payout_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 10000.00
    },
    min_payout_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1.00
    },
    require_approval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    approval_threshold: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 500.00
    },
    max_daily_payouts: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    allowed_payout_methods: {
      type: DataTypes.JSON,
      defaultValue: JSON.stringify(['bank_transfer', 'paypal'])
    },
    createdAt: {
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE
    }

  }, {
    sequelize,
    modelName: 'PoolPayoutSettings',
    freezeTableName: true,
    tableName: 'pool_payout_settings'
  });
  return PoolPayoutSettings;
};