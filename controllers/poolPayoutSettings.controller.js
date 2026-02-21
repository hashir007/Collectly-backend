const responseHandler = require('../utils/responseHandler');
const logger = require("../utils/logger");
const { authorization, Operations } = require('../utils/authorizationResourceFilter.js');
const {
    getPoolMembers,
    getPoolByIDV2
} = require('../services/pool.service.js');
const {
    getPayoutSettings,
    createDefaultSettings,
    updatePayoutSettings,
    validatePayoutAmount,
    checkDailyPayoutLimit
} = require('../services/poolPayoutSettings.service.js');



exports.GetPayoutSettings = async (req, res, next) => {
    try {
        const { poolId } = req.params;
        const currentUser = req.userData;

        if (!poolId) {
            return responseHandler.sendBadRequestResponse(res, 'Pool ID is required');
        }

        let poolMembers = await getPoolMembers(poolId);

        if (!authorization(currentUser, Operations.Read, poolMembers)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const settings = await getPayoutSettings(poolId);

        responseHandler.sendSuccessResponse(res, {
            payoutSettings: settings
        }, "Payout settings retrieved successfully");

    } catch (err) {
        logger.error(`GetPayoutSettings error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.UpdatePayoutSettings = async (req, res, next) => {
    try {
        const { poolId } = req.params;
        const settingsData = req.body;
        const currentUser = req.userData;

        if (!poolId) {
            return responseHandler.sendBadRequestResponse(res, 'Pool ID is required');
        }

        let pool = await getPoolByIDV2(poolId);

        if (!pool) {
            logger.error(`Pool with ID ${poolId} not found`);
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }

        if (!authorization(currentUser, Operations.Update, pool)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const settings = await updatePayoutSettings(poolId, settingsData);

        responseHandler.sendSuccessResponse(res, {
            payoutSettings: settings
        }, "Payout settings updated successfully");

    } catch (err) {
        logger.error(`UpdatePayoutSettings error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.ValidatePayoutAmount = async (req, res, next) => {
    try {
        const { poolId } = req.params;
        const { amount } = req.body;
        const currentUser = req.userData;

        if (!poolId) {
            return responseHandler.sendBadRequestResponse(res, 'Pool ID is required');
        }

        if (!amount || isNaN(amount)) {
            return responseHandler.sendBadRequestResponse(res, 'Valid amount is required');
        }

        let poolMembers = await getPoolMembers(poolId);

        if (!authorization(currentUser, Operations.Read, poolMembers)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const validation = await validatePayoutAmount(poolId, parseFloat(amount));

        responseHandler.sendSuccessResponse(res, {
            validation: validation
        }, "Payout amount validation completed");

    } catch (err) {
        logger.error(`ValidatePayoutAmount error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.CheckDailyPayoutLimit = async (req, res, next) => {
    try {
        const { poolId } = req.params;
        const currentUser = req.userData;

        if (!poolId) {
            return responseHandler.sendBadRequestResponse(res, 'Pool ID is required');
        }

        let poolMembers = await getPoolMembers(poolId);

        if (!authorization(currentUser, Operations.Read, poolMembers)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }


        const limitInfo = await checkDailyPayoutLimit(poolId);

        responseHandler.sendSuccessResponse(res, {
            dailyLimit: limitInfo
        }, "Daily payout limit information retrieved");

    } catch (err) {
        logger.error(`CheckDailyPayoutLimit error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetPayoutSettingsAnalytics = async (req, res, next) => {
    try {
        const { poolId } = req.params;
        const currentUser = req.userData;

        if (!poolId) {
            return responseHandler.sendBadRequestResponse(res, 'Pool ID is required');
        }

        let poolMembers = await getPoolMembers(poolId);

        if (!authorization(currentUser, Operations.Read, poolMembers)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }


        const settings = await getPayoutSettings(poolId);
        const limitInfo = await checkDailyPayoutLimit(poolId);

        const analytics = {
            settings: settings,
            daily_limit: limitInfo,
            utilization_rate: (limitInfo.used / limitInfo.limit) * 100
        };

        responseHandler.sendSuccessResponse(res, {
            analytics: analytics
        }, "Payout settings analytics retrieved successfully");

    } catch (err) {
        logger.error(`GetPayoutSettingsAnalytics error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}