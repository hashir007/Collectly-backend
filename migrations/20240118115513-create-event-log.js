'use strict';
/** @type {import('sequelize-cli').Migration} */
var assert = require('assert');
var _ = require('underscore');

// Define our constants
exports.ACTION_CREATE = 'create';
exports.ACTION_UPDATE = 'update';
exports.ACTION_DELETE = 'delete';
exports.VALID_ACTIONS = [exports.ACTION_CREATE, exports.ACTION_UPDATE, exports.ACTION_DELETE];

exports.SOURCE_USERS = 'users';
exports.SOURCE_SERVER = 'server';
exports.VALID_SOURCES = [exports.SOURCE_USERS, exports.SOURCE_SERVER];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('event_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      source_type: {
        type: Sequelize.STRING(255), allowNull: false,
        validate: { isIn: { args: [exports.VALID_SOURCES], msg: 'Source must be server or users' } }
      },
      source_id: { type: Sequelize.UUID, allowNull: true },
      table_name: { type: Sequelize.STRING(255), allowNull: false },
      table_row_id: { type: Sequelize.UUID, allowNull: false },
      action: {
        type: Sequelize.STRING(32), allowNull: false,
        validate: { isIn: { args: [exports.VALID_ACTIONS], msg: 'Action must be create, update, or delete' } }
      },
      timestamp: { type: Sequelize.DATE, allowNull: false },
      previous_values: { type: Sequelize.JSON, allowNull: false },
      current_values: { type: Sequelize.JSON, allowNull: false },
      transaction_id: {
        // DEV: Since this isn't a foreign key, we can use UUID check for sanity
        type: Sequelize.UUID, allowNull: true,
        validate: { isUUID: 'all' }
      }
    }), {
      validate: {
        requireSourceId: function () {
          if (this.getDataValue('source_type') !== exports.SOURCE_SERVER) {
            assert(this.getDataValue('source_id'), 'source_id required for non-server sources in audit log');
          }
        }
      },
      timestamps: false
    };
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('event_logs');
  }
};