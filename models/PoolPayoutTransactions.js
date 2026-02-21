'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolPayoutTransactions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      PoolPayoutTransactions.belongsTo(models.PoolPayouts, { foreignKey: 'payoutId' });
    }
  }
  PoolPayoutTransactions.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    payoutId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pool_payouts',
        key: 'id'
      }
    },
    transaction_type: {
      type: DataTypes.ENUM('debit', 'credit'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    balance_before: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    balance_after: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'PoolPayoutTransactions',
    freezeTableName: true,
    tableName: 'pool_payout_transactions'
  });
  return PoolPayoutTransactions;
};