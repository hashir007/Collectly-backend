'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('pools_messages', 'poolEventID', {
          type: Sequelize.INTEGER,
          references: {
            model: 'pools_events',
            key: 'id'
          }
        }, {
          transaction: t
        })
      ])
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('pools_messages', 'poolEventID', { transaction: t })
      ])
    });
  }
};
