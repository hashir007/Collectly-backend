'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('user', 'date_of_birth', {
          type: Sequelize.DATE
        }, {
          transaction: t
        }),
        queryInterface.addColumn('user', 'phone', {
          type: 'NVARCHAR(20)'
        },
          { transaction: t })
      ])
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('user', 'date_of_birth', { transaction: t }),
        queryInterface.removeColumn('user', 'phone', { transaction: t })
      ])
    });
  }
};
