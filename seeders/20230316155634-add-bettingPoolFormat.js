'use strict';

const {
  pools_types
} = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('pools_formats', [
      {
        name: 'Bracket'
      },
      {
        name: 'Fantasy'
      },
      {
        name: 'Challenge'
      },
      {
        name: 'Prop Bet'
      },
      {
        name: 'Oscars'
      },
      {
        name: 'Q & A'
      }

    ], {});

    const pools_formatss = await queryInterface.sequelize.query(
      `SELECT id from pools_formats;`
    );

    const pools_formatssRows = pools_formatss[0];

    return await queryInterface.bulkInsert('pools_types_avaliable_formats', [
      {
        pools_formatsID: pools_formatssRows[0].id,
        pools_typesID: (await pools_types.findOne({ where: { name: 'College Basketball' }, attributes: ['id'] })).dataValues.id
      },
      {
        pools_formatsID: pools_formatssRows[1].id,
        pools_typesID: (await pools_types.findOne({ where: { name: 'NFL Football' }, attributes: ['id'] })).dataValues.id
      },
      {
        pools_formatsID: pools_formatssRows[2].id,
        pools_typesID: (await pools_types.findOne({ where: { name: 'Soccer' }, attributes: ['id'] })).dataValues.id
      },
      {
        pools_formatsID: pools_formatssRows[3].id,
        pools_typesID: (await pools_types.findOne({ where: { name: 'Super Bowl' }, attributes: ['id'] })).dataValues.id
      },
      {
        pools_formatsID: pools_formatssRows[4].id,
        pools_typesID: (await pools_types.findOne({ where: { name: 'Academy Awards' }, attributes: ['id'] })).dataValues.id
      },
      {
        pools_formatsID: pools_formatssRows[5].id,
        pools_typesID: (await pools_types.findOne({ where: { name: 'Custom' }, attributes: ['id'] })).dataValues.id
      }
    ], {});

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('pools_formats', {
      [Op.or]: [
        {
          name: 'Bracket'
        },
        {
          name: 'Fantasy'
        },
        {
          name: 'Challenge'
        },
        {
          name: 'Prop Bet'
        },
        {
          name: 'Oscars'
        },
        {
          name: 'Q & A'
        }
      ]
    });
    await queryInterface.bulkDelete('pools_types_avaliable_formats', null, {});
  }
};
