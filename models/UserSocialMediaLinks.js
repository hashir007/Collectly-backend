'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserSocialMediaLinks extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UserSocialMediaLinks.belongsTo(models.User, {
        foreignKey: "createdBy"
      });
      UserSocialMediaLinks.belongsTo(models.User, {
        foreignKey: "modifiedBy"
      });
    }
  }
  UserSocialMediaLinks.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    link: {
      type: DataTypes.TEXT
    },
    social_media: {
      type: DataTypes.STRING
    },
    createdBy: {
      type: DataTypes.INTEGER
    },
    modifiedBy: {
      type: DataTypes.INTEGER
    },
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
    modelName: 'UserSocialMediaLinks',
    freezeTableName: true,
    tableName: 'user_social_media_links'
  });
  return UserSocialMediaLinks;
};