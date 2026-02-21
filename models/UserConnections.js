'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserConnections extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UserConnections.belongsTo(models.User, {
        foreignKey: "userId"
      });

    }
  }
  UserConnections.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: {
      type: DataTypes.INTEGER
    },
    connectionId: {
      type: DataTypes.STRING
    },
    isActive: {
      type: DataTypes.BOOLEAN
    },
    createdAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'UserConnections',
    freezeTableName: true,
    updatedAt: false,
    tableName: 'user_connections'
  });
  return UserConnections;
};