'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('pools_members', 'serviceChargePercentage', { transaction: t })        
      ]);
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('pools_members', 'serviceChargePercentage', {
          type: Sequelize.TEXT
        }, { transaction: t })       
      ]);
    });
  }
};
