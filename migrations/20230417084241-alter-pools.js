'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('pools', 'minimumBuy_in_amount', {
          type: Sequelize.DECIMAL(18, 2)
        }, { transaction: t }),
        queryInterface.addColumn('pools', 'goal_amount', {
          type: Sequelize.DECIMAL(18, 2)
        }, { transaction: t })
      ]);
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('pools', 'minimumBuy_in_amount', { transaction: t }),
        queryInterface.removeColumn('pools', 'goal_amount', { transaction: t }),
      ]);
    });
  }
};
