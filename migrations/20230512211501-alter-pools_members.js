'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('pools_members', 'serviceChargePercentage', {
          type: Sequelize.Sequelize.DECIMAL(18, 2)
        }, { transaction: t })       
      ]);
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('pools_members', 'serviceChargePercentage', { transaction: t })        
      ]);
    });
  }
};
