const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/jwt-token-verifier");
const requestSchemaValidation = require("../middleware/requestSchemaValidation");
const cors = require('cors');
const financeSchema = require("../requestSchemas/finance.schema");
var corsOptions = {
    origin: [process.env.CLIENT_URL],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
const financeController = require("../controllers/finance.controller");




router.get(
    "/finance/final-contribution-amount/:userId/:amount",
    [
        cors(corsOptions),
        jwtAuth,
        requestSchemaValidation.validate(financeSchema.GetFinalContributionAmountSchema),
        financeController.GetFinalContributionAmount
    ]
);

router.post(
    "/finance/create-paypal-order",
    [
        cors(corsOptions),
        requestSchemaValidation.validate(financeSchema.CreatePaypalOrderSchema),
        financeController.CreatePaypalOrder
    ]
);

router.post(
    "/finance/capture-paypal-order",
    [
        cors(corsOptions),
        requestSchemaValidation.validate(financeSchema.CapturePaypalOrderSchema),
        financeController.CapturePaypalOrder
    ]
);

router.get(
    "/finance/total-pool-payment-by-months",
    [
        cors(corsOptions),
        jwtAuth,
        financeController.GetTotalPoolPaymentByMonths
    ]
);

router.get(
    "/finance/total-pool-payment-by-week",
    [
        cors(corsOptions),
        jwtAuth,
        financeController.GetTotalPoolPaymentByWeek
    ]
);

router.get(
    "/finance/pool/payment/order/:orderId",
    [
        cors(corsOptions),
        jwtAuth,
        financeController.GetPoolPayPalOrderDetails
    ]
);

module.exports = router;