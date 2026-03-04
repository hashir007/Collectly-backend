'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pool_payout_votes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      payoutId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'pool_payouts',
          key: 'id'
        }
      },
      voterId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id'
        }
      },
      vote_type: {
        type: Sequelize.ENUM('approve', 'reject', 'abstain'),
        allowNull: false
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      voting_power: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 1.00
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
    await queryInterface.dropTable('pool_payout_votes');
  }
};