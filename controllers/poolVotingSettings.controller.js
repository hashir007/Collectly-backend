const responseHandler = require('../utils/responseHandler');
const logger = require("../utils/logger");
const { authorization, Operations } = require('../utils/authorizationResourceFilter.js');
const {
    getPoolMembers,
    getPoolByIDV2
} = require('../services/pool.service.js');
const {
    getVotingSettings,
    createDefaultSettings,
    updateVotingSettings,
    toggleVoting,
    validateVotingSettings,
    getVotingAnalytics
} = require('../services/poolVotingSettings.service.js');



exports.GetVotingSettings = async (req, res, next) => {
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


        const settings = await getVotingSettings(poolId);

        responseHandler.sendSuccessResponse(res, {
            votingSettings: settings
        }, "Voting settings retrieved successfully");

    } catch (err) {
        logger.error(`GetVotingSettings error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.UpdateVotingSettings = async (req, res, next) => {
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


        // Validate settings data
        const validationErrors = validateVotingSettings(settingsData);
        if (validationErrors.length > 0) {
            return responseHandler.sendBadRequestResponse(res, 'Invalid voting settings', validationErrors);
        }

        const settings = await updateVotingSettings(poolId, settingsData);

        responseHandler.sendSuccessResponse(res, {
            votingSettings: settings
        }, "Voting settings updated successfully");

    } catch (err) {
        logger.error(`UpdateVotingSettings error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.ToggleVoting = async (req, res, next) => {
    try {
        const { poolId } = req.params;
        const { enabled } = req.body;
        const currentUser = req.userData;

        if (!poolId) {
            return responseHandler.sendBadRequestResponse(res, 'Pool ID is required');
        }

        if (typeof enabled !== 'boolean') {
            return responseHandler.sendBadRequestResponse(res, 'Enabled field must be a boolean');
        }

        let pool = await getPoolByIDV2(poolId);

        if (!pool) {
            logger.error(`Pool with ID ${poolId} not found`);
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }

        if (!authorization(currentUser, Operations.Update, pool)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const settings = await toggleVoting(poolId, enabled);

        responseHandler.sendSuccessResponse(res, {
            votingSettings: settings
        }, `Voting ${enabled ? 'enabled' : 'disabled'} successfully`);

    } catch (err) {
        logger.error(`ToggleVoting error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetVotingAnalytics = async (req, res, next) => {
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

        const settings = await getVotingSettings(poolId);

        // Use the service to get analytics
        const analytics = await getVotingAnalytics(poolId, settings);

        responseHandler.sendSuccessResponse(res, {
            analytics: analytics
        }, "Voting analytics retrieved successfully");

    } catch (err) {
        logger.error(`GetVotingAnalytics error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
};
