'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolPayoutMethods extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PoolPayoutMethods.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  PoolPayoutMethods.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    method_type: {
      type: DataTypes.ENUM('bank_transfer', 'paypal', 'venmo', 'cashapp', 'crypto'),
      allowNull: false
    },
    account_details: {
      type: DataTypes.JSON,
      allowNull: false
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    createdAt: {
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'PoolPayoutMethods',
    freezeTableName: true,
    tableName: 'pool_payout_methods'
  });
  return PoolPayoutMethods;
};