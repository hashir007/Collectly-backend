'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pool_payout_transactions', {
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
      transaction_type: {
        type: Sequelize.ENUM('debit', 'credit'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      balance_before: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      balance_after: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      description: {
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
    await queryInterface.dropTable('pool_payout_transactions');
  }
};