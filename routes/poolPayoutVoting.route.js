const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/jwt-token-verifier");
const requestSchemaValidation = require("../middleware/requestSchemaValidation");
const cors = require('cors');
const payoutVotingSchema = require("../requestSchemas/poolPayoutVoting.schema");
var corsOptions = {
    origin: [process.env.CLIENT_URL],
    optionsSuccessStatus: 200
}
const payoutVotingController = require("../controllers/poolPayoutVoting.controller");

router.post(
    "/payouts/:payoutId(\\d+)/vote",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutVotingSchema.CastVoteSchema),
        payoutVotingController.CastVote
    ]
);

router.get(
    "/payouts/:payoutId(\\d+)/voting-results",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutVotingSchema.GetVotingResultsSchema),
        payoutVotingController.GetVotingResults
    ]
);

router.get(
    "/payouts/:payoutId(\\d+)/eligible-voters",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutVotingSchema.GetEligibleVotersSchema),
        payoutVotingController.GetEligibleVoters
    ]
);

router.get(
    "/payouts/:payoutId(\\d+)/voting-status",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutVotingSchema.CheckVotingStatusSchema),
        payoutVotingController.CheckVotingStatus
    ]
);

router.post(
    "/payouts/:payoutId(\\d+)/start-voting",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutVotingSchema.StartVotingSchema),
        payoutVotingController.StartVoting
    ]
);

router.get(
    "/user/voting-history",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutVotingSchema.GetUserVotingHistorySchema),
        payoutVotingController.GetUserVotingHistory
    ]
);

module.exports = router;