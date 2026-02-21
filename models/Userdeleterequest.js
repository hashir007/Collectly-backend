'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserDeleteRequest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UserDeleteRequest.belongsTo(models.User, {
        foreignKey: "userId"
      });
    }
  }
  UserDeleteRequest.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: {
      type: DataTypes.INTEGER
    },
    isProcessed: {
      type: DataTypes.BOOLEAN
    },
    comment: {
      type: DataTypes.TEXT
    },
    createdAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'UserDeleteRequest',
    freezeTableName: true,
    tableName: 'user_delete_requests',
    updatedAt: false,
  });
  return UserDeleteRequest;
};