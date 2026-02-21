'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('pools_entries_votes', 'isYes', {
          type: Sequelize.BOOLEAN,        
        }, {
          transaction: t
        })
      ])
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('pools_entries_votes', 'isYes', { transaction: t })
      ])
    });
  }
};
