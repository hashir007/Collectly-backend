'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pools_members', {
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
      buy_in_amount: Sequelize.DECIMAL(18, 2),     
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
    await queryInterface.dropTable('pools_members');
  }
};