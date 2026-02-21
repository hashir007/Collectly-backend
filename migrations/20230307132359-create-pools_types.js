'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pools_types', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      subName: { type: Sequelize.STRING }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pools_types');
  }
};