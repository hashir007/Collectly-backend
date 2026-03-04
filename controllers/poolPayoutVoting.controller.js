const responseHandler = require('../utils/responseHandler');
const logger = require("../utils/logger");
const { authorization, Operations } = require('../utils/authorizationResourceFilter.js');
const {
    getPoolMembers,
    getPoolByIDV2
} = require('../services/pool.service.js');
const {
    castVote,
    getVotingResults,
    getEligibleVoters,
    canUserVote,
    startVoting
} = require('../services/poolPayoutVoting.service.js');


exports.CastVote = async (req, res, next) => {
    try {
        const { payoutId } = req.params;
        const { voterId } = req.query;
        const { voteType, comments } = req.body;
        const currentUser = req.userData;

        if (!payoutId) {
            return responseHandler.sendBadRequestResponse(res, 'Payout ID is required');
        }

        const validVoteTypes = ['approve', 'reject', 'abstain'];
        if (!validVoteTypes.includes(voteType)) {
            return responseHandler.sendBadRequestResponse(res, 'Invalid vote type');
        }

        const payout = await getVotingResults(payoutId);

        // Authorization check - user must be able to vote on this payout
        let poolMembers = await getPoolMembers(payout.poolPayout.poolID);

        if (!authorization(currentUser, Operations.Read, poolMembers)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const vote = await castVote(payoutId, currentUser.id, voteType, comments);

        responseHandler.sendSuccessResponse(res, {
            vote: vote
        }, "Vote cast successfully");

    } catch (err) {
        logger.error(`CastVote error: ${err.message}`, { stack: err.stack });
        if (err.message.includes('not active') ||
            err.message.includes('ended') ||
            err.message.includes('Only active pool members') ||
            err.message.includes('not found')) {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetVotingResults = async (req, res, next) => {
    try {
        const { payoutId } = req.params;
        const currentUser = req.userData;

        if (!payoutId) {
            return responseHandler.sendBadRequestResponse(res, 'Payout ID is required');
        }

        const results = await getVotingResults(payoutId);

        if (!results) {
            logger.error(`Payout with ID ${payoutId} not found`);
            return responseHandler.sendNotFoundResponse(res, "Payout not found");
        }

        // Check if results has poolPayout and poolID
        if (!results.poolPayout || !results.poolPayout.poolID) {
            logger.error(`Invalid payout data for ID ${payoutId}`);
            return responseHandler.sendNotFoundResponse(res, "Payout data is invalid");
        }

        const poolMembers = await getPoolMembers(results.poolPayout.poolID);

        if (!authorization(currentUser, Operations.Read, poolMembers)) {
            return responseHandler.sendUnauthorizedResponse(res, "Unauthorized to view voting results");
        }

        responseHandler.sendSuccessResponse(res, {
            votingResults: results
        }, "Voting results retrieved successfully");

    } catch (err) {
        logger.error(`GetVotingResults error: ${err.message}`, { stack: err.stack });

        if (err.message === 'Payout not found') {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }

        // Handle specific database errors
        if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeConnectionError') {
            return responseHandler.sendInternalServerErrorResponse(res, "Database error occurred");
        }

        responseHandler.sendInternalServerErrorResponse(res, "Internal server error");
    }
}

exports.GetEligibleVoters = async (req, res, next) => {
    try {
        const { payoutId } = req.params;
        const currentUser = req.userData;

        if (!payoutId) {
            return responseHandler.sendBadRequestResponse(res, 'Payout ID is required');
        }

        const payout = await getVotingResults(payoutId);

        // Authorization check - user must be a member of the pool
        const isAuthorized = await authorization(currentUser, Operations.Read, payout.poolPayout);
        if (!isAuthorized) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const voters = await getEligibleVoters(payoutId);

        responseHandler.sendSuccessResponse(res, {
            voters: voters
        }, "Eligible voters retrieved successfully");

    } catch (err) {
        logger.error(`GetEligibleVoters error: ${err.message}`, { stack: err.stack });
        if (err.message === 'Payout not found') {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.CheckVotingStatus = async (req, res, next) => {
    try {
        const { payoutId } = req.params;
        const currentUser = req.userData;

        if (!payoutId) {
            return responseHandler.sendBadRequestResponse(res, 'Payout ID is required');
        }

        const results = await getVotingResults(payoutId);

        if (!results) {
            logger.error(`Payout with ID ${payoutId} not found`);
            return responseHandler.sendNotFoundResponse(res, "Payout not found");
        }

        // Check if results has poolPayout and poolID
        if (!results.poolPayout || !results.poolPayout.poolID) {
            logger.error(`Invalid payout data for ID ${payoutId}`);
            return responseHandler.sendNotFoundResponse(res, "Payout data is invalid");
        }

        const poolMembers = await getPoolMembers(results.poolPayout.poolID);

        if (!authorization(currentUser, Operations.Read, poolMembers)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const votingStatus = await canUserVote(payoutId, currentUser.id);

        responseHandler.sendSuccessResponse(res, {
            votingStatus: votingStatus
        }, "Voting status retrieved successfully");

    } catch (err) {
        logger.error(`CheckVotingStatus error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.StartVoting = async (req, res, next) => {
    try {
        const { payoutId } = req.params;
        const { durationHours } = req.body;
        const currentUser = req.userData;

        if (!payoutId) {
            return responseHandler.sendBadRequestResponse(res, 'Payout ID is required');
        }

        const payout = await getVotingResults(payoutId);

        // Authorization check - user must be admin/owner of the pool
        const isAuthorized = await authorization(currentUser, Operations.Update, payout.poolPayout);
        if (!isAuthorized) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const updatedPayout = await startVoting(payoutId, durationHours || 72);

        responseHandler.sendSuccessResponse(res, {
            payout: updatedPayout
        }, "Voting started successfully");

    } catch (err) {
        logger.error(`StartVoting error: ${err.message}`, { stack: err.stack });
        if (err.message.includes('already enabled') ||
            err.message.includes('not enabled') ||
            err.message.includes('not found')) {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetUserVotingHistory = async (req, res, next) => {
    try {
        const currentUser = req.userData;
        const { page = 1, limit = 10 } = req.query;

        // Authorization - user can only see their own voting history
        const isAuthorized = await authorization(currentUser, Operations.Read, { user_id: currentUser.id });
        if (!isAuthorized) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        // This would require additional service implementation
        // For now, returning placeholder response
        responseHandler.sendSuccessResponse(res, {
            votes: [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                totalPages: 0
            }
        }, "Voting history retrieved successfully");

    } catch (err) {
        logger.error(`GetUserVotingHistory error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}