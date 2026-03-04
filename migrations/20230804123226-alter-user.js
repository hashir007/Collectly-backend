'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('user', 'payout_email_address', {
          type: 'NVARCHAR(500)'
        }, {
          transaction: t
        }),
        queryInterface.addColumn('user', 'payout_payer_id', {
          type: 'NVARCHAR(500)'
        },
          { transaction: t })
      ])
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('user', 'payout_email_address', { transaction: t }),
        queryInterface.removeColumn('user', 'payout_payer_id', { transaction: t })
      ])
    });
  }
};
