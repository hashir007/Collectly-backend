'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('pools_winners', 'isFinalWinner', {
          type: Sequelize.BOOLEAN
        }, {
          transaction: t
        })
      ])
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('pools_winners', 'isFinalWinner', { transaction: t })
      ])
    });
  }
};
