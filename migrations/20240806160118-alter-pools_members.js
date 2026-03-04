'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('pools_members', 'buy_in_amount', { transaction: t }),
        queryInterface.removeColumn('pools_members', 'isPaid', { transaction: t })
      ])
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('pools_members', 'buy_in_amount', {
          type: Sequelize.DECIMAL(18, 2)
        }, {
          transaction: t
        }),
        queryInterface.addColumn('pools_members', 'isPaid', {
          type: Sequelize.TINYINT
        }, { transaction: t })
      ])
    });
  }
};
