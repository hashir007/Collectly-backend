'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserSettings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UserSettings.belongsTo(models.User, {
        foreignKey: 'userId'
      });
    }
  }
  UserSettings.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    notification_email: DataTypes.BOOLEAN,
    notification_sms: DataTypes.BOOLEAN,
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
    modelName: 'UserSettings',
    freezeTableName: true,
    tableName: 'user_settings'
  });
  return UserSettings;
};