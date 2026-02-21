'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolPayoutVotes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PoolPayoutVotes.belongsTo(models.PoolPayouts, { foreignKey: 'payoutId', as: 'payout' });
      PoolPayoutVotes.belongsTo(models.User, { foreignKey: 'voterId', as: 'voter' });
    }
  }
  PoolPayoutVotes.init({
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
    voterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    vote_type: {
      type: DataTypes.ENUM('approve', 'reject', 'abstain'),
      allowNull: false
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    voting_power: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1.00
    },
    createdAt: {
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'PoolPayoutVotes',
    freezeTableName: true,
    tableName: 'pool_payout_votes'
  });
  return PoolPayoutVotes;
};