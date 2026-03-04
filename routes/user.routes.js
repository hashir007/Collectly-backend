const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/jwt-token-verifier");
const requestSchemaValidation = require("../middleware/requestSchemaValidation");
const cors = require('cors');
const userSchema = require("../requestSchemas/user.schema");
var corsOptions = {
    origin: [process.env.CLIENT_URL],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
const userController = require("../controllers/user.controller");


router.get(
    "/user/:userId/me",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getAccountSchema),
        userController.GetProfile
    ]
);

router.put(
    "/user/:userId/profile-update",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.updateProfileSchema),
        userController.UpdateProfile
    ]
);

router.get(
    "/user/:userId/payout",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getPayoutDetailsSchema),
        userController.GetPayoutDetails
    ]
);

router.put(
    "/user/:userId/payout-update",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.updatePayoutDetailsSchema),
        userController.UpdatePayoutDetails
    ]
);

router.get(
    "/user/:userId/contributions/:page/:pageSize",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getAllContributionByUserIdSchema),
        userController.GetAllContributionByUserId
    ]
);

router.get(
    "/user/:userId/subscription-history/:page/:pageSize",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getSubscriptionHistorySchema),
        userController.GetSubscriptionHistory
    ]
);

router.get(
    "/user/:userId/subscription-payments/:page/:pageSize",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getSubscriptionsPaymentsSchema),
        userController.GetSubscriptionsPayments
    ]
);

router.get(
    "/user/:userId/subscription",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getSubscriptionSchema),
        userController.GetSubscription
    ]
);

router.get(
    "/user/:userId/subscription-plans",
    [
        jwtAuth,
        userController.GetPlans
    ]
);

router.get(
    "/user/:userId/social-media-links",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getSocialMediaByUserIdSchema),
        userController.GetSocialMediaByUserId
    ]
);

router.post(
    "/user/:userId/social-media-links",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.addOrUpdateSocialMediaLinksSchema),
        userController.AddOrUpdateSocialMediaLinks
    ]
);

router.get(
    "/user/:userId/settings",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getUserSettingsSchema),
        userController.GetUserSettings
    ]
);

router.post(
    "/user/:userId/settings",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.updateUserSettingsSchema),
        userController.UpdateUserSettings
    ]
);


router.get(
    "/user/:userId/apps",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getMyAppsSchema),
        userController.GetMyApps
    ]
);


router.post(
    "/user/:userId/apps",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.createAppSchema),
        userController.CreateApp
    ]
);


router.get(
    "/user/:userId/referrals",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getUserReferralsSchema),
        userController.GetUserReferrals
    ]
);


router.get(
    "/user/:userId/identity-verification-status",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getIdentityVerificationStatusSchema),
        userController.GetIdentityVerificationStatus
    ]
);


router.post(
    "/user/:userId/media-upload",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.uploadProfileImageSchema),
        userController.UploadProfileImage
    ]
);


router.post(
    "/user/contact-us",
    [
        requestSchemaValidation.validate(userSchema.addcontactUsSchema),
        userController.ContactUs
    ]
);


router.get(
    "/user/:userId/pool-statistics",
    [
        jwtAuth,
        requestSchemaValidation.validate(userSchema.getPoolStatisticsByUserIdSchema),
        userController.GetPoolStatisticsByUserId
    ]
);

module.exports = router;