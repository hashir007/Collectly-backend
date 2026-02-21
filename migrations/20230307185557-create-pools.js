'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pools', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.INTEGER,
        references: {
          model: "pools_types",
          key: "id",
        }
      },
      format: {
        type: Sequelize.INTEGER,
        references: {
          model: "pools_formats",
          key: "id",
        }
      },
      defaultBuy_in_amount: Sequelize.DECIMAL(18, 2),      
      status: Sequelize.INTEGER,
      createdBy: {
        type: Sequelize.INTEGER       
      },
      modifiedBy: Sequelize.INTEGER,
      ownerID: { 
        type: Sequelize.INTEGER ,
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
    await queryInterface.dropTable('pools');
  }
};