const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const moment = require('moment');
const multer = require("multer");
const path = require("path");
const {
    AuthToken
} = require('../models');


async function createAuthToken(authToken) {
    let result = {};
    try {

        result = await AuthToken.create(authToken);
    }
    catch (err) {
        throw err;
    }
    return result;

}

async function getAuthTokenByToken(refreshToken) {
    let result = {};
    try {

        result = await AuthToken.findOne({
            where: {
                refreshToken: refreshToken
            }
        });

    } catch (err) {
        throw err;
    }
    return result;
}

async function getAuthTokenByUserId(userId) {
    let result = {};
    try {

        result = await AuthToken.findOne({
            where: {
                userId: userId
            }
        });

    } catch (err) {
        throw err;
    }
    return result;
}

async function deleteAuthTokenByToken(userId) {
    let result = {};
    try {

        result = await AuthToken.destroy({
            where: {
                userId: userId
            }
        });

    } catch (err) {
        throw err;
    }
    return result;
}

module.exports = {
    createAuthToken,
    getAuthTokenByToken,
    getAuthTokenByUserId,
    deleteAuthTokenByToken
};