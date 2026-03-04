const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/jwt-token-verifier");
const requestSchemaValidation = require("../middleware/requestSchemaValidation");
const cors = require('cors');
const authController = require("../controllers/auth.controller");
const authSchema = require("../requestSchemas/auth.schema");
var corsOptions = {
  origin: [process.env.CLIENT_URL],
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}


router.post(
  "/auth/login",
  [
    requestSchemaValidation.validate(authSchema.WebLoginSchema),
    authController.WebLogin
  ]
);


router.post(
  "/auth/login-mobile",
  [
    requestSchemaValidation.validate(authSchema.WebLoginSchema),
    authController.MobileLogin
  ]
);


router.post(
  "/auth/register",
  [
    requestSchemaValidation.validate(authSchema.WebRegisterSchema),
    authController.WebRegister
  ]
);


router.post(
  "/auth/refresh-token",
  [
    requestSchemaValidation.validate(authSchema.WebRefreshTokenSchema),
    authController.WebRefreshToken
  ]
);


router.post(
  "/auth/create-forgot-password",
  [
    cors(corsOptions),
    requestSchemaValidation.validate(authSchema.CreateForgotPasswordSchema),
    authController.CreateForgotPassword
  ]
);


router.post(
  "/auth/reset-password",
  [
    cors(corsOptions),
    requestSchemaValidation.validate(authSchema.ChangePasswordSchema),
    authController.ResetPassword
  ]
);


router.post(
  "/auth/:userId/change-account-password",
  [
    cors(corsOptions),
    jwtAuth,
    requestSchemaValidation.validate(authSchema.ChangeAccountPasswordSchema),
    authController.ChangeAccountPassword
  ]
);


router.post(
  "/auth/user/:id(\\d+)/email-verification-request/",
  [

    requestSchemaValidation.validate(authSchema.CreateEmailVerificationRequestSchema),
    authController.CreateEmailVerificationRequest
  ]
);


router.get(
  "/auth/email-verification?&?",
  [

    requestSchemaValidation.validate(authSchema.MarkEmailVerifiedSchema),
    authController.MarkEmailVerified
  ]
);

router.post(
  "/auth/:userId(\\d+)/delete-account",
  [
    jwtAuth,
    requestSchemaValidation.validate(authSchema.HaveAccountMarkedForDeletionSchema),
    authController.DeleteAccount
  ]
);


router.get(
  "/auth/:userId(\\d+)/notifications-unread/:page/:pageSize",
  [
    jwtAuth,
    requestSchemaValidation.validate(authSchema.GetNotificationsUnReadSchema),
    authController.GetNotificationsUnRead
  ]
);

router.post(
  "/auth/:userId(\\d+)/notifications/list/:page/:pageSize",
  [
    jwtAuth,
    requestSchemaValidation.validate(authSchema.GetNotificationsUnReadSchema),
    authController.GetNotifications
  ]
);

router.post(
  "/auth/:userId(\\d+)/notifications/mark-as-read/:notificationId(\\d+)",
  [
    jwtAuth,
    requestSchemaValidation.validate(authSchema.MarkNotificationReadSchema),
    authController.MarkNotificationRead
  ]
);


router.post(
  "/auth/:userId(\\d+)/notifications/delete/:notificationId(\\d+)",
  [
    jwtAuth,
    requestSchemaValidation.validate(authSchema.NotificationDeleteSchema),
    authController.NotificationDelete
  ]
);

router.get(
  "/auth/:userId(\\d+)/download-data",
  [
    jwtAuth,
    requestSchemaValidation.validate(authSchema.DownloadPersonalDataSchema),
    authController.DownloadPersonalData
  ]
);

router.get(
  "/auth/download-export/:token",
  [
    jwtAuth,
    requestSchemaValidation.validate(authSchema.DownloadExportFileSchema),
    authController.DownloadExportFile
  ]
);


module.exports = router;