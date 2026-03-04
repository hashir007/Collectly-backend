'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pool_payouts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      poolID: {
        type: Sequelize.INTEGER,
        references: {
          model: "pools",
          key: "id",
        }
      },
      recipientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id'
        }
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'pending_voting'),
        defaultValue: 'pending'
      },
      createdby: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id'
        }
      },
      voting_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      voting_starts_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      voting_ends_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      voting_status: {
        type: Sequelize.ENUM('not_started', 'active', 'completed', 'cancelled'),
        defaultValue: 'not_started'
      },
      voting_result: {
        type: Sequelize.ENUM('approved', 'rejected', 'pending', 'failed'),
        defaultValue: 'pending'
      },
      approve_votes: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      reject_votes: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      abstain_votes: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_votes: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      approval_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0.00
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE
      },
      updatedAt: {
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pool_payouts');
  }
};