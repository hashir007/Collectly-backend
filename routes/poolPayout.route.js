const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/jwt-token-verifier");
const requestSchemaValidation = require("../middleware/requestSchemaValidation");
const cors = require('cors');
const payoutSchema = require("../requestSchemas/poolPayout.schema");
var corsOptions = {
    origin: [process.env.CLIENT_URL],
    optionsSuccessStatus: 200
}
const payoutController = require("../controllers/poolPayout.controller");

router.get(
    "/pools/:poolId(\\d+)/payouts",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSchema.GetPoolPayoutsSchema),
        payoutController.GetPoolPayouts
    ]
);

router.get(
    "/payouts/:payoutId(\\d+)",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSchema.GetPayoutByIdSchema),
        payoutController.GetPayoutById
    ]
);

router.post(
    "/pools/:poolId(\\d+)/payouts",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSchema.CreatePayoutSchema),
        payoutController.CreatePayout
    ]
);

router.put(
    "/payouts/:payoutId(\\d+)/status",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSchema.UpdatePayoutStatusSchema),
        payoutController.UpdatePayoutStatus
    ]
);

router.post(
    "/payouts/:payoutId(\\d+)/cancel",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSchema.CancelPayoutSchema),
        payoutController.CancelPayout
    ]
);

router.get(
    "/pools/:poolId(\\d+)/payouts/stats",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSchema.GetPayoutStatsSchema),
        payoutController.GetPayoutStats
    ]
);

router.get(
    "/pools/:poolId(\\d+)/payouts/eligible-members",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSchema.GetEligibleMembersSchema),
        payoutController.GetEligibleMembers
    ]
);

module.exports = router;