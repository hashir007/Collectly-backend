'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await Promise.all([
        queryInterface.addColumn(
          'pools',
          'total_contributed',
          {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00, // ✅ Set default value here
          },
          { transaction: t }
        ),
      ]);
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await Promise.all([
        queryInterface.removeColumn('pools', 'total_contributed', { transaction: t }),
      ]);
    });
  },
};
