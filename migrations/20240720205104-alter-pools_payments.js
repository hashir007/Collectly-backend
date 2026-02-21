'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('pools_payments', 'discount', {
          type: Sequelize.DECIMAL(18, 2)
        }, {
          transaction: t
        })
      ])
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('pools_payments', 'discount', { transaction: t })
      ])
    });
  }
};
