'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscriptions_payments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      subscriptionId: {
        type: Sequelize.STRING
      },      
      resource_type: {
        type: Sequelize.STRING
      },
      event_type: {
        type: Sequelize.STRING
      },
      summary: {
        type: Sequelize.TEXT
      },
      total_amount: {
        type: Sequelize.DECIMAL(18, 2)
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: "user",
          key: "id",
        }
      },
      response: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('subscriptions_payments');
  }
};