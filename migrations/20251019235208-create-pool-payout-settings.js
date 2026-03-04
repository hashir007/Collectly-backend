'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pool_payout_settings', {
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
      max_payout_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 10000.00
      },
      min_payout_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 1.00
      },
      require_approval: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      approval_threshold: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 500.00
      },
      max_daily_payouts: {
        type: Sequelize.INTEGER,
        defaultValue: 10
      },
      allowed_payout_methods: {
        type: Sequelize.JSON,
        defaultValue: JSON.stringify(['bank_transfer', 'paypal'])
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
    await queryInterface.dropTable('pool_payout_settings');
  }
};