'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolPayouts extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      PoolPayouts.belongsTo(models.User, {
        foreignKey: "recipientId",
        as: 'recipient'
      });

      PoolPayouts.belongsTo(models.User, {
        foreignKey: "createdby",
        as: 'creator'
      });

      PoolPayouts.belongsTo(models.Pools, {
        foreignKey: "poolID",
        as: 'pool'
      });

      PoolPayouts.hasMany(models.PoolPayoutTransactions, { foreignKey: 'payoutId' , as: 'payoutTransactions' });
      PoolPayouts.hasMany(models.PoolPayoutVotes, { foreignKey: 'payoutId',as:'votes' });
      PoolPayouts.hasMany(models.PoolPayoutApprovals, { foreignKey: 'payoutId' });
      
    }
  }
  PoolPayouts.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    poolID: {
      type: DataTypes.INTEGER,
      references: {
        model: "pools",
        key: "id",
      }
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'pending_voting'),
      defaultValue: 'pending'
    },
    createdby: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    voting_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    voting_starts_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    voting_ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    voting_status: {
      type: DataTypes.ENUM('not_started', 'active', 'completed', 'cancelled'),
      defaultValue: 'not_started'
    },
    voting_result: {
      type: DataTypes.ENUM('approved', 'rejected', 'pending', 'failed'),
      defaultValue: 'pending'
    },
    approve_votes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reject_votes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    abstain_votes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_votes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    approval_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
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
    modelName: 'PoolPayouts',
    freezeTableName: true,
    tableName: 'pool_payouts'
  });
  return PoolPayouts;
};