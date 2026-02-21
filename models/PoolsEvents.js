'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PoolsEvents extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PoolsEvents.hasMany(models.Pools, {
        foreignKey: "PoolEventID"
      });

      PoolsEvents.hasMany(models.PoolsMessages, {
        foreignKey: "eventID"
      });

      PoolsEvents.hasMany(models.PoolsEventTips, {
        foreignKey: "eventId"
      });

      PoolsEvents.belongsTo(models.User, {
        foreignKey: "createdBy"
      });

    }
  }
  PoolsEvents.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    visibility: DataTypes.BOOLEAN,
    address: DataTypes.STRING,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    maxMembersInPool: DataTypes.INTEGER,
    maxPool: DataTypes.INTEGER,
    eventDate: DataTypes.DATE,
    photo_id: DataTypes.INTEGER,
    website: DataTypes.TEXT,
    createdBy: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE

  }, {
    sequelize,
    modelName: 'PoolsEvents',
    freezeTableName: true,
    tableName: 'pools_events'
  });
  return PoolsEvents;
};