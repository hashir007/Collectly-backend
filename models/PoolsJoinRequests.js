'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolJoinRequests extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PoolJoinRequests.belongsTo(models.Pools, {
        foreignKey: "poolID"
      });

      PoolJoinRequests.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }
  }
  PoolJoinRequests.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: "user",
        key: "id",
      }
    },
    poolID: {
      type: DataTypes.INTEGER,
      references: {
        model: "pools",
        key: "id",
      }
    },
    referral_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER
    },
    createdAt: {
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'PoolJoinRequests',
    freezeTableName: true,
    tableName: 'pools_join_requests'
  });
  return PoolJoinRequests;
};