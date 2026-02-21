'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('pools_payments', 'transaction_id', {
          type: 'NVARCHAR(300)'
        }, {
          transaction: t
        }),
        queryInterface.addColumn('pools_payments', 'source', {
          type: 'NVARCHAR(100)'
        },
          {
            transaction: t
          }),
        queryInterface.removeColumn('pools_payments', 'payer_id', { transaction: t }),
      ])
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('pools_payments', 'transaction_id', { transaction: t }),
        queryInterface.removeColumn('pools_payments', 'source', { transaction: t }),
        queryInterface.addColumn('pools_payments', 'source', {
          type: 'VARCHAR(255)'
        },
          {
            transaction: t
          }),
      ])
    });
  }
};
