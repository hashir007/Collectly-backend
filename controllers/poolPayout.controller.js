const responseHandler = require('../utils/responseHandler');
const logger = require("../utils/logger");
const { authorization, Operations } = require('../utils/authorizationResourceFilter.js');
const {
    getPoolPayouts,
    getPayoutById,
    createPayout,
    updatePayoutStatus,
    cancelPayout,
    getPayoutStats,
    getEligibleMembers
} = require('../services/poolPayout.service.js');
const {
    getPoolMembers,
    getPoolByIDV2
} = require('../services/pool.service.js');

exports.GetPoolPayouts = async (req, res, next) => {
    try {
        const { poolId } = req.params;
        const {
            page = 1,
            limit = 10,
            status,
            voting_status,
            search
        } = req.query;
        const currentUser = req.userData;

        if (!poolId) {
            return responseHandler.sendBadRequestResponse(res, 'Pool ID is required');
        }

        let poolMembers = await getPoolMembers(poolId);

        if (!authorization(currentUser, Operations.Read, poolMembers)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const result = await getPoolPayouts(poolId, {
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            voting_status,
            search
        });

        responseHandler.sendSuccessResponse(res, {
            payouts: result.payouts,
            pagination: result.pagination
        }, "Payouts retrieved successfully");

    } catch (err) {
        logger.error(`GetPoolPayouts error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetPayoutById = async (req, res, next) => {
    try {
        const { payoutId } = req.params;
        const currentUser = req.userData;

        if (!payoutId) {
            return responseHandler.sendBadRequestResponse(res, 'Payout ID is required');
        }

        const payout = await getPayoutById(payoutId);

        if (!authorization(currentUser, Operations.Read, payout)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        responseHandler.sendSuccessResponse(res, {
            payout: payout
        }, "Payout retrieved successfully");

    } catch (err) {
        logger.error(`GetPayoutById error: ${err.message}`, { stack: err.stack });
        if (err.message === 'Payout not found') {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.CreatePayout = async (req, res, next) => {
    try {
        const { poolId } = req.params;
        const { recipientId, amount, description, enableVoting } = req.body;
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


        const payout = await createPayout({
            poolID: poolId,
            recipientId: recipientId,
            amount: parseFloat(amount),
            description,
            created_by: currentUser.id,
            enable_voting: enableVoting || false
        });

        responseHandler.sendSuccessResponse(res, {
            payout: payout
        }, "Payout created successfully", 201);

    } catch (err) {
        logger.error(`CreatePayout error: ${err.message}`, { stack: err.stack });
        if (err.message.includes('not found') || err.message.includes('exceeds')) {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.UpdatePayoutStatus = async (req, res, next) => {
    try {
        const { payoutId } = req.params;
        const { status, failureReason } = req.body;
        const currentUser = req.userData;

        if (!payoutId) {
            return responseHandler.sendBadRequestResponse(res, 'Payout ID is required');
        }

        const payout = await getPayoutById(payoutId);

        if (!payout) {
            logger.error(`Payout with ID ${payoutId} not found`);
            return responseHandler.sendNotFoundResponse(res, "Payout not found");
        }

        if (!authorization(currentUser, Operations.Update, payout)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return responseHandler.sendBadRequestResponse(res, 'Invalid status');
        }

        const updatedPayout = await updatePayoutStatus(payoutId, status, failureReason);

        responseHandler.sendSuccessResponse(res, {
            payout: updatedPayout
        }, "Payout status updated successfully");

    } catch (err) {
        logger.error(`UpdatePayoutStatus error: ${err.message}`, { stack: err.stack });
        if (err.message === 'Payout not found') {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }
        else if (err.message.includes('Failed to update Payout status:')) {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.CancelPayout = async (req, res, next) => {
    try {
        const { payoutId } = req.params;
        const { reason } = req.body;
        const currentUser = req.userData;

        if (!payoutId) {
            return responseHandler.sendBadRequestResponse(res, 'Payout ID is required');
        }

        const payout = await getPayoutById(payoutId);

        if (!payout) {
            logger.error(`payout with ID ${payoutId} not found`);
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }

        if (!authorization(currentUser, Operations.Update, payout)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const cancelledPayout = await cancelPayout(payoutId, reason);

        responseHandler.sendSuccessResponse(res, {
            payout: cancelledPayout
        }, "Payout cancelled successfully");

    } catch (err) {
        logger.error(`CancelPayout error: ${err.message}`, { stack: err.stack });
        if (err.message === 'Payout not found') {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }
        if (err.message.includes('Cannot cancel')) {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetPayoutStats = async (req, res, next) => {
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

        const stats = await getPayoutStats(poolId);

        responseHandler.sendSuccessResponse(res, {
            stats: stats
        }, "Payout statistics retrieved successfully");

    } catch (err) {
        logger.error(`GetPayoutStats error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetEligibleMembers = async (req, res, next) => {
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

        const members = await getEligibleMembers(poolId);

        responseHandler.sendSuccessResponse(res, {
            members: members
        }, "Eligible members retrieved successfully");

    } catch (err) {
        logger.error(`GetEligibleMembers error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}