'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolPayoutApprovals extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PoolPayoutApprovals.belongsTo(models.PoolPayouts, { foreignKey: 'payoutId' });
      PoolPayoutApprovals.belongsTo(models.User, { foreignKey: 'approverId' });
    }
  }
  PoolPayoutApprovals.init({
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
    approverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    approval_status: {
      type: DataTypes.ENUM('approved', 'rejected', 'pending'),
      defaultValue: 'pending'
    },
    comments: {
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
    modelName: 'PoolPayoutApprovals',
    tableName: 'pool_payout_approvals',
    freezeTableName: true,
  });
  return PoolPayoutApprovals;
};