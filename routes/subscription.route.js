const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/jwt-token-verifier");
const requestSchemaValidation = require("../middleware/requestSchemaValidation");
const cors = require('cors');
const subscriptionSchema = require("../requestSchemas/subscription.schema");
var corsOptions = {
    origin: [process.env.CLIENT_URL],
    optionsSuccessStatus: 200
}
const subscriptionController = require("../controllers/subscription.controller");

// Create Subscription
router.post(
    "/subscription/create",
    [
        jwtAuth,
        requestSchemaValidation.validate(subscriptionSchema.CreateSubscriptionSchema),
        subscriptionController.createSubscription
    ]
);

// Capture Subscription
router.post(
    "/subscription/capture",
    [
        jwtAuth,
        requestSchemaValidation.validate(subscriptionSchema.CaptureSubscriptionSchema),
        subscriptionController.captureSubscription
    ]
);

// Get Subscription Details
router.get(
    "/subscription/details/:subscriptionId",
    [
        jwtAuth,
        requestSchemaValidation.validate(subscriptionSchema.GetSubscriptionDetailsSchema),
        subscriptionController.getSubscriptionDetails
    ]
);

// Cancel Subscription
router.post(
    "/subscription/cancel",
    [
        jwtAuth,
        requestSchemaValidation.validate(subscriptionSchema.CancelSubscriptionSchema),
        subscriptionController.cancelSubscription
    ]
);

// Get Current Subscription
router.get(
    "/subscription/current",
    [
        jwtAuth,
        subscriptionController.getCurrentSubscription
    ]
);

// Get User Subscriptions
router.get(
    "/subscription/user",
    [
        jwtAuth,
        requestSchemaValidation.validate(subscriptionSchema.GetUserSubscriptionsSchema),
        subscriptionController.getUserSubscriptions
    ]
);

module.exports = router;