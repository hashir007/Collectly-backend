const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/jwt-token-verifier");
const requestSchemaValidation = require("../middleware/requestSchemaValidation");
const cors = require('cors');
const poolSchema = require("../requestSchemas/pool.schema");
var corsOptions = {
  origin: [process.env.CLIENT_URL],
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
const poolController = require("../controllers/pool.controller");


router.get(
  "/pool/:id(\\d+)",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.GetPoolByIDSchema),
    poolController.GetPoolByID
  ]
);

router.post(
  "/pool/list/:page/:pageSize",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.FilterPoolsSchema),
    poolController.FilterPools
  ]
);

router.post(
  "/pool/:id(\\d+)/members",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.FilterPoolMembersSchema),
    poolController.FilterPoolMembers
  ]
);

router.get(
  "/pool/default-settings",
  [
    jwtAuth,
    poolController.GetDefaultSettings
  ]
);

router.post(
  "/pool/:id(\\d+)/member/:memberID(\\d+)",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.MakeMemberPoolAdminSchema),
    poolController.MakeMemberPoolAdmin
  ]
);

router.get(
  "/pool/:id(\\d+)/member-goals",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.GetPoolMembersWithGoalAmountSchema),
    poolController.GetPoolMembersWithGoalAmount
  ]
);

router.post(
  "/pool/:id(\\d+)/invite/:mode(email|sms)",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.InviteNotificationSchema),
    poolController.InviteNotification
  ]
);

router.post(
  "/pool/:id(\\d+)/join-request",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.RequestToJoinPoolSchema),
    poolController.RequestToJoinPool
  ]
);

router.get(
  "/pool/:id(\\d+)/join-requests",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.GetPendingJoinRequestsSchema),
    poolController.GetPendingJoinRequests
  ]
);

router.get(
  "/pool/:id(\\d+)/join-details",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.GetJoinPoolDetailsSchema),
    poolController.GetJoinPoolDetails
  ]
);

router.post(
  "/pool/:id(\\d+)/join-request/:requestId(\\d+)/member/:memberID(\\d+)",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.UpdatePoolJoiningRequestSchema),
    poolController.UpdatePoolJoiningRequest
  ]
);

router.post(
  "/pool/:id(\\d+)/media-upload",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.UploadPoolImageSchema),
    poolController.UploadPoolImage
  ]
);

router.put(
  "/pool/:id(\\d+)",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.UpdatePoolSchema),
    poolController.UpdatePool
  ]
);


router.post(
  "/pool/:id(\\d+)/delete-request",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.PoolDeleteRequestSchema),
    poolController.PoolDeleteRequest
  ]
);


router.post(
  "/pool/",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.CreatePoolSchema),
    poolController.CreatePool
  ]
);

router.post(
  "/pool/:id(\\d+)/report",
  [
    jwtAuth,
    requestSchemaValidation.validate(poolSchema.SubmitReportSchema),
    poolController.SubmitReport
  ]
);

router.get(
  '/pool/:id/members/:memberID',
  [
    jwtAuth,
    poolController.getPoolMemberDetails
  ]
);

router.patch(
  'pool/:id/members/:memberID/role',
  [
    jwtAuth,
    poolController.updateMemberRole
  ]
);

router.delete(
  '/pool/:id/members/:memberID',
  [
    jwtAuth,
    poolController.removeMemberFromPool
  ]
);

router.get(
  '/pool/:id/members/:memberID/contributions',
  [
    jwtAuth,
    poolController.getMemberContributions
  ]
);

router.get(
  '/pool/:id/members/:memberID/activity',
  [
    jwtAuth,
    poolController.getMemberActivity
  ]
);



module.exports = router;