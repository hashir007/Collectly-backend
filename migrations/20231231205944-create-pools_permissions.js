'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pools_permissions', {
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
      memberID: {
        type: Sequelize.INTEGER,
        references: {
          model: "user",
          key: "id",
        }
      },
      roleID: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pools_permissions');
  }
};