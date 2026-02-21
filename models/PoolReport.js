'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolReport extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      PoolReport.belongsTo(models.User, { foreignKey: 'resolvedBy', as: 'resolver' });
      PoolReport.belongsTo(models.User, { foreignKey: 'reporterId', as: 'reporter' });

      PoolReport.belongsTo(models.Pools, { foreignKey: 'poolID' });
    }
  }
  PoolReport.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    poolID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pools',
        key: 'id'
      }
    },
    reporterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    categories: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    primaryReason: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    additionalDetails: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'dismissed'),
      defaultValue: 'pending'
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    }
  }, {
    sequelize,
    modelName: 'PoolReport',
    freezeTableName: true,
    tableName: 'pool_reports'
  });
  return PoolReport;
};