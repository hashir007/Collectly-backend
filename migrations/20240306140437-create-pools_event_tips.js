'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pools_event_tips', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: "user",
          key: "id",
        }
      },     
      status: {
        type: Sequelize.STRING
      },
      amount: {
        type: Sequelize.DECIMAL(18, 2)
      },
      eventId: {
        type: Sequelize.INTEGER,
        references: {
          model: "pools_events",
          key: "id",
        }
      },
      response: {
        type: Sequelize.TEXT
      },
      payer_id: {
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
    await queryInterface.dropTable('pools_event_tips');
  }
};