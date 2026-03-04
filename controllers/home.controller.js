const responseHandler = require('../utils/responseHandler.js');
const logger = require("../utils/logger");



exports.Index = async (req, res, next) => {
    try {
        return res.render('home/index', {
        });
    } catch (error) {
        // Pass errors to Express error handler
        return next(error);
    }
}