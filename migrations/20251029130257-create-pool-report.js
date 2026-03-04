'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pool_reports', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      poolID: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'pools',
          key: 'id'
        }
      },
      reporterId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id'
        }
      },
      categories: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      primaryReason: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      additionalDetails: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'under_review', 'resolved', 'dismissed'),
        defaultValue: 'pending'
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium'
      },
      adminNotes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
      },
      updatedAt: {
        type: Sequelize.DATE,
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pool_reports');
  }
};