'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.bulkInsert('pools_types', [
      {
        name: 'College Basketball',
        subName:'March Madness'
      },
      {
        name: 'NFL Football',
        subName:'Fantasy Football'
      },
      {
        name: 'Soccer',
        subName:'FIFA World Cup'
      },
      {
        name: 'Super Bowl',
        subName:'Prop Bet'
      },
      {
        name: 'Academy Awards',
        subName:'Oscars'
      },
      {
        name: 'Custom',
        subName:''
      }
    ], {});

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.bulkDelete('pools_types', {
      [Op.or]: [
        {
          name: 'College Basketball',
          subName:'March Madness'
        },
        {
          name: 'NFL Football',
          subName:'Fantasy Football'
        },
        {
          name: 'Soccer',
          subName:'FIFA World Cup'
        },
        {
          name: 'Super Bowl',
          subName:'Prop Bet'
        },
        {
          name: 'Academy Awards',
          subName:'Oscars'
        },
        {
          name: 'Custom',
          subName:''
        }
    ]});
  }
};
