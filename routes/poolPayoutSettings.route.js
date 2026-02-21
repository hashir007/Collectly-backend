const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/jwt-token-verifier");
const requestSchemaValidation = require("../middleware/requestSchemaValidation");
const cors = require('cors');
const payoutSettingsSchema = require("../requestSchemas/poolPayoutSettings.schema");
var corsOptions = {
    origin: [process.env.CLIENT_URL],
    optionsSuccessStatus: 200
}
const payoutSettingsController = require("../controllers/poolPayoutSettings.controller");

router.get(
    "/pools/:poolId(\\d+)/payout-settings",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSettingsSchema.GetPayoutSettingsSchema),
        payoutSettingsController.GetPayoutSettings
    ]
);

router.put(
    "/pools/:poolId(\\d+)/payout-settings",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSettingsSchema.UpdatePayoutSettingsSchema),
        payoutSettingsController.UpdatePayoutSettings
    ]
);

router.post(
    "/pools/:poolId(\\d+)/payout-settings/validate-amount",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSettingsSchema.ValidatePayoutAmountSchema),
        payoutSettingsController.ValidatePayoutAmount
    ]
);

router.get(
    "/pools/:poolId(\\d+)/payout-settings/daily-limit",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSettingsSchema.CheckDailyPayoutLimitSchema),
        payoutSettingsController.CheckDailyPayoutLimit
    ]
);

router.get(
    "/pools/:poolId(\\d+)/payout-settings/analytics",
    [
        jwtAuth,
        requestSchemaValidation.validate(payoutSettingsSchema.GetPayoutSettingsAnalyticsSchema),
        payoutSettingsController.GetPayoutSettingsAnalytics
    ]
);

module.exports = router;