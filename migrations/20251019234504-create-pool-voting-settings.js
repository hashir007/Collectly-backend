'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pool_voting_settings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      poolId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'pools',
          key: 'id'
        }
      },
      voting_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      voting_threshold: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 51.00,
        comment: 'Percentage of votes required for approval'
      },
      voting_duration: {
        type: Sequelize.INTEGER,
        defaultValue: 72,
        comment: 'Voting duration in hours'
      },
      min_voters: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Minimum number of voters required'
      },
      voting_type: {
        type: Sequelize.ENUM('one_share_one_vote', 'one_member_one_vote', 'weighted_by_contribution'),
        defaultValue: 'one_member_one_vote'
      },
      auto_approve: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Auto-approve if voting threshold is met'
      },
      allow_abstain: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      require_quorum: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      quorum_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 50.00
      },
      createdAt: {
        type: Sequelize.DATE
      },
      updatedAt: {
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pool_voting_settings');
  }
};