'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasMany(models.Pools, {
        foreignKey: 'ownerID',
        as: 'ownedPools'
      });
      User.hasMany(models.PoolsMembers, {
        foreignKey: "memberID",
        as: 'poolMember'
      });
      User.hasMany(models.PoolsPayments, {
        foreignKey: "memberID"
      });
      User.hasMany(models.PoolsMessages, {
        foreignKey: "createdBy"
      });
      User.hasMany(models.PoolsMessages, {
        foreignKey: "modifiedBy"
      });
      User.hasMany(models.PoolsPermissions, {
        foreignKey: "memberID",
        as: 'poolMemberPermissions'
      });
      User.hasMany(models.SubscriptionsHistories, {
        foreignKey: "userId"
      });
      User.hasMany(models.SubscriptionsPayments, {
        foreignKey: "userId"
      });
      User.hasMany(models.Subscriptions, {
        foreignKey: "userId"
      });
      User.hasMany(models.UserSocialMediaLinks, {
        foreignKey: "createdBy"
      });
      User.hasMany(models.UserSocialMediaLinks, {
        foreignKey: "modifiedBy"
      });
      User.hasMany(models.PoolsEventTips, {
        foreignKey: "userId"
      });
      User.hasMany(models.PoolsEvents, {
        foreignKey: "createdBy"
      });
      User.hasMany(models.UserSettings, {
        foreignKey: "userId"
      });
      User.hasMany(models.UserProjects, {
        foreignKey: "userId"
      });
      User.hasMany(models.UserReferral, {
        foreignKey: "userId"
      });
      User.hasMany(models.UserReferral, {
        foreignKey: "refer_userId"
      });
      User.hasMany(models.UserEmailVerifications, {
        foreignKey: "userId"
      });
      User.hasMany(models.UserConnections, {
        foreignKey: "userId"
      });
      User.hasMany(models.UserDeleteRequest, {
        foreignKey: "userId"
      });
      User.hasMany(models.PoolJoinRequests, {
        foreignKey: "userId"
      });

      User.hasMany(models.PoolPayouts, {
        foreignKey: "recipientId",
        as: 'receivedPayouts'
      });

      User.hasMany(models.PoolPayouts, {
        foreignKey: "createdby",
        as: 'createdPayouts'
      });

      User.hasMany(models.PoolPayoutMethods, {
        foreignKey: "userId"
      });

      User.hasMany(models.PoolPayoutVotes, {
        foreignKey: 'voterId',
        as: 'payoutVotes'
      });

      User.hasMany(models.PoolPayoutApprovals, {
        foreignKey: 'approverId',
        as: 'payoutApprovals'
      });

      User.hasMany(models.PoolReport, {
        foreignKey: 'resolvedBy',
        as: 'poolReportResolver'
      });

      User.hasMany(models.PoolReport, {
        foreignKey: 'reporterId',
        as: 'poolReportReporter'
      });

    }
  }
  User.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    username: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    payout_email_address: 'NVARCHAR(500)',
    payout_payer_id: 'NVARCHAR(500)',
    photo_id: DataTypes.INTEGER,
    status: DataTypes.INTEGER,
    date_of_birth: {
      type: DataTypes.DATE
    },
    phone: 'NVARCHAR(20)',
    referral_code: DataTypes.STRING,
    credits_earned: DataTypes.DECIMAL(18, 2),
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE
    }
  }, {
    hooks: {
      afterCreate: function (model, options) {
        var action = "create";
        var auditLog = sequelize.models.EventLog.build({
          source_type: 'users', // 'server', 'users'
          source_id: model.createdBy, // NULL (server), user.id
          table_name: "user",
          table_row_id: model.get('id'),
          action: action,
          timestamp: new Date(),
          previous_values: {},
          current_values: model.dataValues,
          transaction_id: options.transaction ? options.transaction.id : null
        });
        return auditLog.save({ transaction: options.transaction });
      },
      afterUpdate: function (model, options) {
        var action = "update";
        var auditLog = sequelize.models.EventLog.build({
          source_type: 'users', // 'server', 'users'
          source_id: model.createdBy, // NULL (server), user.id
          table_name: "user",
          table_row_id: model.get('id'),
          action: action,
          timestamp: new Date(),
          previous_values: model._previousDataValues,
          current_values: model.dataValues,
          transaction_id: options.transaction ? options.transaction.id : null
        });
        return auditLog.save({ transaction: options.transaction });
      },
      afterDestroy: function (model, options) {
        var action = "delete";
        var auditLog = sequelize.models.EventLog.build({
          source_type: 'users', // 'server', 'users'
          source_id: model.createdBy, // NULL (server), user.id
          table_name: "user",
          table_row_id: model.get('id'),
          action: action,
          timestamp: new Date(),
          previous_values: model._previousDataValues,
          current_values: model.dataValues,
          transaction_id: options.transaction ? options.transaction.id : null
        });
        return auditLog.save({ transaction: options.transaction });
      }
    },
    sequelize,
    modelName: 'User',
    freezeTableName: true,
    tableName: 'user'
  });
  return User;
};