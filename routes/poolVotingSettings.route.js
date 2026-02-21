const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/jwt-token-verifier");
const requestSchemaValidation = require("../middleware/requestSchemaValidation");
const cors = require('cors');
const votingSettingsSchema = require("../requestSchemas/poolVotingSettings.schema");
var corsOptions = {
  origin: [process.env.CLIENT_URL],
  optionsSuccessStatus: 200
}
const votingSettingsController = require("../controllers/poolVotingSettings.controller");

router.get(
  "/pools/:poolId(\\d+)/voting-settings",
  [
    jwtAuth,
    requestSchemaValidation.validate(votingSettingsSchema.GetVotingSettingsSchema),
    votingSettingsController.GetVotingSettings
  ]
);

router.put(
  "/pools/:poolId(\\d+)/voting-settings",
  [
    jwtAuth,
    requestSchemaValidation.validate(votingSettingsSchema.UpdateVotingSettingsSchema),
    votingSettingsController.UpdateVotingSettings
  ]
);

router.post(
  "/pools/:poolId(\\d+)/voting-settings/toggle",
  [
    jwtAuth,
    requestSchemaValidation.validate(votingSettingsSchema.ToggleVotingSchema),
    votingSettingsController.ToggleVoting
  ]
);

router.get(
  "/pools/:poolId(\\d+)/voting-analytics",
  [
    jwtAuth,
    requestSchemaValidation.validate(votingSettingsSchema.GetVotingAnalyticsSchema),
    votingSettingsController.GetVotingAnalytics
  ]
);

module.exports = router;