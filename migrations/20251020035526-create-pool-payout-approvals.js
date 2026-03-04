'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pool_payout_approvals', {
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
      approverId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id'
        }
      },
      approval_status: {
        type: Sequelize.ENUM('approved', 'rejected', 'pending'),
        defaultValue: 'pending'
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.dropTable('pool_payout_approvals');
  }
};