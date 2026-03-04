'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserReferral extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UserReferral.belongsTo(models.User, {
        foreignKey: 'userId',
        as:'User'
      });
      UserReferral.belongsTo(models.User, {
        foreignKey: 'refer_userId',
        as:'ReferUser'
      });
    }
  }
  UserReferral.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: DataTypes.INTEGER,
    refer_userId: DataTypes.INTEGER,
    credits: DataTypes.DECIMAL(18, 2),
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
    modelName: 'UserReferral',
    freezeTableName: true,
    tableName: 'user_referrals'
  });
  return UserReferral;
};