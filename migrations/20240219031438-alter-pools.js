'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('pools', 'PoolEventID', {
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
        queryInterface.removeColumn('pools', 'PoolEventID', { transaction: t })
      ])
    });
  }
};
