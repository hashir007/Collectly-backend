const responseHandler = require('../utils/responseHandler');
const crypto = require('crypto');
const {
    SendMail,
    SendPaymentMail
} = require("../utils/sendEmail");
const {
    fsReadFileHtml
} = require("../utils/fileHandler.js");
const {
    Operations,
    authorization
} = require('../utils/authorizationResourceFilter.js');
const {
    PoolsPayments
} = require('../models');
const {
    getFinalContributionAmount,
    createPaypalOrder,
    capturePaypalOrder,
    addPaymentDetails,
    formatTotalPoolPaymentByMonths,
    getTotalPoolPaymentByMonths,
    formatTotalPoolPaymentByWeek,
    getTotalPoolPaymentByWeek,
    authorizePoolPaymentsAccess,
    getPoolPaymentByOrderId
} = require('../services/finance.service.js');
const {
    getPoolByID
} = require('../services/pool.service.js');
const logger = require("../utils/logger");




exports.GetFinalContributionAmount = async (req, res, next) => {
    try {

        const { userId, amount } = req.params;

        return responseHandler.sendSuccessResponse(res, {
            ContributionAmount: await getFinalContributionAmount(userId, amount),
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`GetFinalContributionAmount error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.CreatePaypalOrder = async (req, res, next) => {
    try {

        const { contributionAmount, discountedContributionAmount, Id, discount, type } = req.body;

        let order = await createPaypalOrder(contributionAmount, discountedContributionAmount, Id, discount, type);

        return responseHandler.sendSuccessResponse(res, {
            Order: order,
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`GetFinalContributionAmount error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.CapturePaypalOrder = async (req, res, next) => {
    try {

        const { orderId, Id, userId, type } = req.body;

        let capture = await capturePaypalOrder(orderId);

        if (capture) {

            if (type === 'POOL') {

                let result = await addPaymentDetails(capture, orderId, Id, userId);

                return responseHandler.sendSuccessResponse(res, {
                    Capture: result,
                }, "Success!!!");
            }
        }
        else {
            return responseHandler.sendInternalServerErrorResponse(res, "Something went wrong.!!");
        }

    }
    catch (err) {
        if ((err.name) && (err.name === 'AxiosError')) {
            return responseHandler.sendInternalServerErrorResponse(res, err.response.data.message);
        }
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetTotalPoolPaymentByMonths = async (req, res, next) => {
    try {

        const currentUser = req.userData;

        const records = await getTotalPoolPaymentByMonths(currentUser.id);

        if (!(await authorizePoolPaymentsAccess(currentUser, records))) {
            return responseHandler.sendUnauthorizedResponse(res, "Unauthorized access to pool payments");
        }

        const result = formatTotalPoolPaymentByMonths(records);

        return responseHandler.sendSuccessResponse(res, {
            Contribution: result,
        }, "Pool payment data retrieved successfully");
    } catch (err) {
        logger.error(`GetTotalPoolPaymentByMonths error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res, "Failed to retrieve pool payment data");
    }
}

exports.GetTotalPoolPaymentByWeek = async (req, res, next) => {
    try {

        const currentUser = req.userData;

        const [previousWeekData, currentWeekData] = await Promise.all([
            getTotalPoolPaymentByWeek(currentUser.id, 1), // Previous week
            getTotalPoolPaymentByWeek(currentUser.id, 0)  // Current week
        ]);

        // Check authorization for both datasets
        const allRecords = [...previousWeekData, ...currentWeekData];
        if (!(await authorizePoolPaymentsAccess(currentUser, allRecords))) {
            return responseHandler.sendUnauthorizedResponse(res, "Unauthorized access to pool payments");
        }

        const result = formatTotalPoolPaymentByWeek(previousWeekData, currentWeekData);

        return responseHandler.sendSuccessResponse(res, {
            Contribution: result,
        }, "Weekly pool payment data retrieved successfully");
    } catch (err) {
        logger.error(`GetTotalPoolPaymentByWeek error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res, "Failed to retrieve weekly pool payment data");
    }
}

exports.MobilePayment = async (req, res, next) => {
    try {
        const { payload } = req.params;

        if (!payload) {
            return responseHandler.sendInternalServerErrorResponse(res, "Missing payload");
        }

        // decode input
        const bufferObj = Buffer.from(payload, "base64");
        const decodedString = bufferObj.toString("utf8");
        const result = decodedString.split('&');

        const amount = result[0];
        const discountAmount = result[1];
        const discount = result[2];
        const itemId = result[3];
        const type = result[4];
        const userId = result[5];

        let itemName = '';
        let itemPhoto = '';

        if (type === 'POOL') {
            const pool = await getPoolByID(itemId);
            itemName = pool.toJSON().name;
            itemPhoto = pool.toJSON().photo;
        } else {
            const event = await getPoolEventById(itemId);
            itemName = event.toJSON().name;
            itemPhoto = event.toJSON().photo;
        }

        // Base URL used by your client fetches
        const baseUrl = process.env.BASE_URL || '';

        // Determine environment
        const isProd = process.env.NODE_ENV === 'production';

        // PayPal hosts to allow (include sandbox for testing)
        const paypalHosts = isProd
            ? [
                'https://www.paypal.com',
                'https://api.paypal.com'
            ]
            : [
                'https://www.paypal.com',
                'https://api.paypal.com',
                'https://www.sandbox.paypal.com',
                'https://api. sandbox.paypal.com',
                'https://api-m.sandbox.paypal.com'
            ];

        // Build the CSP directive lists WITHOUT NONCE
        // Using only 'unsafe-inline' (nonce would make unsafe-inline ignored)
        const scriptSrcHosts = [
            "'self'",
            "'unsafe-inline'", // Required for PayPal SDK to inject scripts
            'https://applepay.cdn-apple.com',
            ...paypalHosts
        ];

        const styleSrcHosts = [
            "'self'",
            "'unsafe-inline'", // Required for PayPal SDK to inject styles
            'https://fonts.googleapis.com',
            'https://fonts.gstatic. com',
            ...paypalHosts
        ];

        const fontSrcHosts = [
            "'self'",
            'https://fonts.gstatic.com',
            'https://fonts.googleapis.com',
            'data:'
        ];

        const imgSrcHosts = [
            "'self'",
            'data:',
            'https:',
            'blob:',
            ...paypalHosts
        ];

        // connect-src must include PayPal logger endpoints
        const connectSrcHosts = ["'self'"];
        if (baseUrl) connectSrcHosts.push(baseUrl);
        connectSrcHosts.push(...paypalHosts);

        // frame-src and child-src for PayPal iframes
        const frameSrcHosts = [...paypalHosts];
        const childSrcHosts = [...paypalHosts];

        // Compose CSP header
        const cspDirectives = [
            `default-src 'self'`,
            `script-src ${scriptSrcHosts.join(' ')}`,
            `style-src ${styleSrcHosts.join(' ')}`,
            `font-src ${fontSrcHosts.join(' ')}`,
            `img-src ${imgSrcHosts.join(' ')}`,
            `connect-src ${connectSrcHosts.join(' ')}`,
            `frame-src ${frameSrcHosts.join(' ')}`,
            `child-src ${childSrcHosts.join(' ')}`,
            `base-uri 'self'`,
            `object-src 'none'`,
            `form-action 'self'`
        ];
        const csp = cspDirectives.join('; ');

        // Set CSP header (this will override the middleware CSP for this specific route)
        res.setHeader('Content-Security-Policy', csp);

        // Render template WITHOUT cspNonce (we're using unsafe-inline instead)
        res.render('managePayment/mobilePayment', {
            contributionAmount: amount,
            discountedContributionAmount: discountAmount,
            itemId,
            discount,
            itemType: type,
            clientId: process.env.PAYPAL_CLIENT_ID,
            merchantId: process.env.PAYPAL_MERCHANT_ID,
            base: baseUrl,
            itemName,
            itemPhoto,
            userId,
            customScheme: process.env.CUSTOM_SCHEME,
            androidPackage: process.env.ANDROID_PACKAGE_NAME,
            iOSPackage: process.env.IOS_BUNDLE_ID,
        });
    }
    catch (err) {
        console.error('MobilePayment error', err);
        res.status(500).send('Server error');
    }
}

exports.GetPoolPayPalOrderDetails = async (req, res, next) => {
    try {
        const { orderId } = req.params;

        let result = await getPoolPaymentByOrderId(orderId);

        return responseHandler.sendSuccessResponse(res, result, "Success!!!");
    }
    catch (err) {
        return responseHandler.sendInternalServerErrorResponse(res, err.message);
    }
}