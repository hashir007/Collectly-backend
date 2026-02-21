'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolVotingSettings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PoolVotingSettings.belongsTo(models.Pools, { foreignKey: 'poolID', as:'Pool' });      
    }
  }
  PoolVotingSettings.init({
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
    voting_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    voting_threshold: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 51.00,
      comment: 'Percentage of votes required for approval'
    },
    voting_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 72,
      comment: 'Voting duration in hours'
    },
    min_voters: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Minimum number of voters required'
    },
    voting_type: {
      type: DataTypes.ENUM('one_share_one_vote', 'one_member_one_vote', 'weighted_by_contribution'),
      defaultValue: 'one_member_one_vote'
    },
    auto_approve: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Auto-approve if voting threshold is met'
    },
    allow_abstain: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    require_quorum: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    quorum_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 50.00
    },
    createdAt: {
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'PoolVotingSettings',
    freezeTableName: true,
    tableName: 'pool_voting_settings'
  });
  return PoolVotingSettings;
};