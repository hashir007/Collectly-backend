'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pools_winners', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      poolID: {
        type: Sequelize.INTEGER,
        references: {
          model: "pools",
          key: "id",
        }
      },
      winnerId: {
        type: Sequelize.INTEGER,
        references: {
          model: "user",
          key: "id",
        }
      },
      createdBy: {
        type: Sequelize.INTEGER,
        references: {
          model: "user",
          key: "id",
        }
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
    await queryInterface.dropTable('pools_winners');
  }
};