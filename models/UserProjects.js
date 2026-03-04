'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserProjects extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UserProjects.belongsTo(models.User, {
        foreignKey: 'userId'
      });
    }
  }
  UserProjects.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    name: DataTypes.STRING,
    client_id: DataTypes.STRING,
    client_secret: DataTypes.STRING,
    key: DataTypes.STRING,
    iv: DataTypes.STRING,
    algorithm: DataTypes.STRING,
    userId: DataTypes.INTEGER,
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'UserProjects',
    freezeTableName: true,
    tableName: 'user_projects'
  });
  return UserProjects;
};