'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pools_types_avaliable_formats', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },   
      pools_typesID: {
        type: Sequelize.INTEGER,
        references: {
          model: "pools_types",
          key: "id",
        }
      },  
      pools_formatsID: {
        type: Sequelize.INTEGER,
        references: {
          model: "pools_formats",
          key: "id",
        }
      },
     
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pools_types_avaliable_formats');
  }
};