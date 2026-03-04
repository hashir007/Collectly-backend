const bcrypt = require('bcrypt');
const moment = require('moment');
const https = require("https");
var Axios = require("axios");
const qs = require('querystring');
const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const {
    fsReadFileHtml
} = require("../utils/fileHandler.js");
const smsTemplate = require('../sms_templates/messages.json');
const {
    Pools,
    PoolsPlans,
    PoolsTypes,
    PoolsFormats,
    PoolsMembers,
    PoolsPayments,
    User,
    PoolsSettings,
    Notifications,
    PoolsPermissions,
    Subscriptions,
    UserSettings,
    PoolsEvents,
    PoolsEventTips,
} = require('../models');
const {
    Operations,
    authorization
} = require('../utils/authorizationResourceFilter.js');
const {
    getPoolByIDV2
} = require('./pool.service.js');

const {
    SendEmailNotification,
    SendSMSNotification,
    SendAppNotification
} = require("./notification.service.js");
const {
    createUser
} = require("./auth.service.js");
const fs = require('fs');
var ejs = require('ejs');
var path = require('path');


const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK_NAMES = ["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"];
const MONTHS_IN_YEAR = 12;
const DAYS_IN_WEEK = 7;


async function getFinalContributionAmount(userId, contributionAmount) {

    let result = {
        amount: parseFloat(contributionAmount),
        discount: 0
    }

    try {

        let paymentSource = await PoolsPayments.count({
            where: {
                memberID: userId
            }
        });

        // CASE WHEN NEW USER START

        if (paymentSource.length === 0) {
            result.amount = parseFloat(contributionAmount) - parseFloat(process.env.REFERRAL_CREDIT);
            result.discount = parseFloat(process.env.REFERRAL_CREDIT);
        }

        // CASE WHEN NEW USER END

        else {

            let contributingUser = await User.findOne({
                where: {
                    id: userId
                }
            });

            if (parseFloat(contributingUser.credits_earned) >= parseFloat(process.env.REFERRAL_CREDIT)) {

                result.amount = parseFloat(contributionAmount) - parseFloat(process.env.REFERRAL_CREDIT);
                result.discount = parseFloat(process.env.REFERRAL_CREDIT);
            }

        }


    } catch (err) {
        throw err;
    }

    return result;
}

async function createPaypalOrder(contributionAmount, discountedContributionAmount, Id, discount, type) {
    let result = {};
    try {

        let name = ''
        if (type === 'POOL') {

            let pool = await Pools.findOne({
                where: {
                    id: Id
                }
            });

            name = pool.name;
        } else if (type === 'EVENT') {

            let event = await PoolsEvents.findOne({
                where: {
                    id: Id
                }
            });

            name = event.name;
        }

        getToken = async () => {
            let token = {};
            const auth = Buffer.from(process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_SECRET_ID).toString("base64")
            const url = process.env.PAYPAL_URL + '/v1/oauth2/token'
            const headers = {
                Authorization: `Basic ${auth}`,
            }
            try {
                const resp = await Axios.post(url,
                    qs.stringify({ grant_type: 'client_credentials' }),
                    { headers }
                );
                token = resp.data;

            } catch (err) {
                throw err;
            }
            return token
        }

        createOrder = async (name, token) => {
            let order = {};

            const url = process.env.PAYPAL_URL + '/v2/checkout/orders'
            const headers = {
                'Authorization': `Bearer ${token.access_token}`,
                "Content-Type": "application/json"
            }

            try {

                const resp = await Axios.post(url,
                    JSON.stringify({
                        intent: "CAPTURE",
                        purchase_units: [
                            {
                                reference_id: Id,
                                description: name,
                                amount: {
                                    currency_code: "USD",
                                    value: discountedContributionAmount,
                                    breakdown: {
                                        item_total: {
                                            currency_code: "USD",
                                            value: contributionAmount,
                                        },
                                        discount: {
                                            currency_code: "USD",
                                            value: discount,
                                        }
                                    }
                                }
                            },
                        ],
                    }),
                    { headers }
                );

                order = resp.data;

            } catch (err) {
                throw err;
            }
            return order;
        }

        let token = await getToken();

        result = await createOrder(name, token);

    } catch (err) {
        throw err;
    }
    return result;
}

async function capturePaypalOrder(orderId) {
    let result = {};
    try {

        getToken = async () => {
            let token = {};
            const auth = Buffer.from(process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_SECRET_ID).toString("base64")
            const url = process.env.PAYPAL_URL + '/v1/oauth2/token'
            const headers = {
                Authorization: `Basic ${auth}`,
            }
            try {
                const resp = await Axios.post(url,
                    qs.stringify({ grant_type: 'client_credentials' }),
                    { headers }
                );
                token = resp.data;

            } catch (err) {
                throw err;
            }
            return token
        }

        doCapture = async (token, orderId) => {
            let capture = {};
            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: process.env.PAYPAL_URL + `/v2/checkout/orders/${orderId}/capture`,
                headers: {
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                    'Authorization': `Bearer ${token.access_token}`
                },
                data: {}
            };
            try {
                let resp = await Axios.request(config);
                capture = resp.data;
            }
            catch (err) {
                throw err;
            }
            return capture;
        }

        let token = await getToken();

        result = await doCapture(token, orderId);

    } catch (err) {
        throw err;
    }
    return result;
}

async function addPaymentDetails(response, orderId, poolID, userId) {
    try {
        const currentDateTime = new Date();

        const {
            amount,
            isSuccess,
            payer_email,
            name,
            source,
            status,
            transaction_id,
            item_total,
            discount,
            createdAt
        } = parsePayerDetails(response);

        let serviceChargePercentage = 0;
        let app_payer_user = null;

        // Find or create user
        if (userId) {
            app_payer_user = await User.findOne({
                where: { id: userId }
            });

            if (!app_payer_user) {
                throw new Error(`User with ID ${userId} not found`);
            }
        } else {
            app_payer_user = await User.findOne({
                where: { email: payer_email }
            });
        }

        if (!app_payer_user) {
            const saltRounds = 10;
            const randomPassword = (Math.random() + 1).toString(36).substring(7);
            const hash = await bcrypt.hash(randomPassword, saltRounds);

            const nameParts = parseName(name);
            app_payer_user = await createUser(
                payer_email.substring(0, payer_email.indexOf('@')),
                hash,
                nameParts.firstName,
                nameParts.lastName,
                payer_email,
                1,
                null,
                null,
                null
            );
        }

        // Find or create pool member
        const [member, memberCreated] = await PoolsMembers.findOrCreate({
            where: {
                memberID: app_payer_user.id,
                poolID: poolID
            },
            defaults: {
                poolID: poolID,
                memberID: app_payer_user.id,
                createdAt: currentDateTime,
                total_contributed: 0 // Initialize if new member
            }
        });

        // Create permission if member was newly created
        if (memberCreated) {
            await PoolsPermissions.create({
                poolID: poolID,
                memberID: app_payer_user.id,
                roleID: 3,
                createdAt: currentDateTime
            });
        }

        // Process successful payment
        if (isSuccess) {
            // Apply discount if any
            if (discount > 0 && app_payer_user.credits_earned >= discount) {
                await User.update({
                    credits_earned: parseFloat(app_payer_user.credits_earned) - discount
                }, {
                    where: { id: app_payer_user.id }
                });
            }

            // Update total_contributed in pools_members for this member
            const memberContributionAmount = parseFloat(amount);
            await PoolsMembers.update({
                total_contributed: sequelize.literal(`COALESCE(total_contributed, 0) + ${memberContributionAmount}`)
            }, {
                where: {
                    memberID: app_payer_user.id,
                    poolID: poolID
                }
            });

            // Update total_contributed in pools table
            await Pools.update({
                total_contributed: sequelize.literal(`COALESCE(total_contributed, 0) + ${memberContributionAmount}`)
            }, {
                where: {
                    id: poolID
                }
            });
        }

        // Record payment
        await PoolsPayments.create({
            memberID: member.memberID,
            response: JSON.stringify(response),
            status: status,
            amount: parseFloat(amount),
            poolID: poolID,
            transaction_id: transaction_id,
            createdAt: currentDateTime,
            serviceChargePercentage: serviceChargePercentage,
            discount: discount,
            total: parseFloat(item_total),
            source: source,
            order_id: orderId
        });

        // Get updated pool data
        const result = await getPoolByIDV2(poolID);

        // Send notifications if payment was successful
        if (isSuccess) {
            // Get pool members for notifications
            const poolMembers = await PoolsMembers.findAll({
                where: { poolID: poolID },
                attributes: ['memberID']
            });

            const memberIDs = poolMembers.map(member => member.memberID);

            // Check if goal is reached using parameterized query
            const totalSoFarResult = await sequelize.query(
                'SELECT SUM(total) as total FROM pools_payments WHERE poolID = ? AND status = "COMPLETED"',
                {
                    type: QueryTypes.SELECT,
                    replacements: [poolID]
                }
            );

            const totalSoFar = parseFloat(totalSoFarResult[0]?.total) || 0;
            const isGoalReached = totalSoFar >= parseFloat(result.goal_amount);

            // Send email notification
            try {
                const template = await fsReadFileHtml('/email_templates/poolContributionTemplate.ejs');
                const mailBody = ejs.render(template, {
                    pool: result,
                    Amount: amount,
                    Contributer: app_payer_user,
                    createdAt: createdAt
                });

                await SendEmailNotification(
                    false,
                    app_payer_user.id,
                    app_payer_user.email,
                    "Pool Contributed",
                    mailBody
                );
            } catch (emailError) {
                console.error('Error sending email notification:', emailError);
            }

            // Send SMS notification
            try {
                const smsBody = smsTemplate.POOL_CONTRIBUTION
                    .replace('{0}', `${app_payer_user.firstName} ${app_payer_user.lastName}`)
                    .replace('{1}', `${result.name}`);

                await SendSMSNotification(false, app_payer_user.id, app_payer_user.phone, smsBody);
            } catch (smsError) {
                console.error('Error sending SMS notification:', smsError);
            }

            // Send app notifications to all pool members
            try {
                const notificationPromises = memberIDs.map(async (memberId) => {
                    try {
                        let message = `Pool ${result.name}, $${amount} amount contributed`;

                        if (isGoalReached) {
                            const goalMessage = `Pool ${result.name}, goal amount reached.`;
                            await SendAppNotification(memberId, goalMessage);
                        }

                        await SendAppNotification(memberId, message);
                    } catch (memberError) {
                        console.error(`Error sending app notification to user ${memberId}:`, memberError);
                    }
                });

                await Promise.allSettled(notificationPromises);
            } catch (notificationError) {
                console.error('Error sending app notifications:', notificationError);
            }
        }

        return result;

    } catch (err) {
        console.error('Error in addPaymentDetails:', err);
        throw err;
    }
}

function parsePayerDetails(PaypalResponse) {
    let result = {
        amount: 0,
        isSuccess: false,
        source: '',
        payer_email: '',
        name: '',
        status: '',
        transaction_id: '',
        item_total: 0,
        discount: 0,
        createdAt: ''
    };

    try {
        if (!PaypalResponse) {
            return result;
        }

        // Safe navigation through the response object
        const purchaseUnits = PaypalResponse.purchase_units?.[0];
        if (!purchaseUnits) {
            return result;
        }

        const captures = purchaseUnits.payments?.captures?.[0];
        const amountBreakdown = purchaseUnits.amount?.breakdown;

        let amount = 0;
        let isSuccess = false;
        let source = '';
        let email = '';
        let name = '';
        let status = '';
        let transaction_id = '';
        let item_total = 0;
        let discount = 0;
        let createdAt = '';

        // Extract amount and status from captures
        if (captures) {
            amount = parseFloat(captures.amount?.value) || 0;
            status = captures.status || '';
            isSuccess = status === "COMPLETED";
            transaction_id = captures.id || PaypalResponse.id || '';
            createdAt = captures.create_time || '';
        }

        // Extract source
        if (PaypalResponse.payment_source) {
            source = Object.keys(PaypalResponse.payment_source)[0] || '';
        }

        // Extract item_total and discount from breakdown
        if (amountBreakdown) {
            item_total = parseFloat(amountBreakdown.item_total?.value) || amount;
            discount = parseFloat(amountBreakdown.discount?.value) || 0;
        } else {
            item_total = amount;
            discount = 0;
        }

        // Extract payer information based on source
        if (source === 'paypal') {
            email = PaypalResponse.payer?.email_address || '';
            name = `${PaypalResponse.payer?.name?.given_name || ''} ${PaypalResponse.payer?.name?.surname || ''}`.trim();
        } else if (source === 'apple_pay' || source === 'card') {
            email = purchaseUnits.shipping?.email_address || '';
            name = purchaseUnits.shipping?.name?.full_name || '';
        }

        result = {
            amount: amount,
            isSuccess: isSuccess,
            source: source,
            payer_email: email,
            name: name,
            status: status,
            transaction_id: transaction_id,
            item_total: item_total,
            discount: discount,
            createdAt: createdAt
        };

    } catch (err) {
        console.error('Error parsing payer details:', err);
        // Return default result instead of throwing to prevent breaking the payment flow
        return result;
    }

    return result;
}

function formatTotalPoolPaymentByMonths(data) {
    try {
        // Create array with all months, filling in missing data with zeros
        const dataByMonths = Array.from({ length: MONTHS_IN_YEAR }, (_, i) => {
            const monthData = data.find(x => x.MONTH === i + 1);
            return monthData
                ? { ...monthData, total_contributed: parseFloat(monthData.total_contributed) || 0 }
                : { total_contributed: 0, MONTH: i + 1 };
        });

        return dataByMonths.map(item => [
            MONTH_NAMES[item.MONTH - 1],
            item.total_contributed
        ]);
    } catch (err) {
        console.error('Error formatting monthly pool payments:', err);
        throw err;
    }
}

async function getTotalPoolPaymentByMonths(userId) {
    try {
        // Use parameterized query to prevent SQL injection
        const query = `
            SELECT 
                SUM(amount) AS total_contributed, 
                MONTH(createdAt) AS MONTH, 
                :userId AS user_id 
            FROM pools_payments 
            WHERE poolID IN (
                SELECT id FROM pools WHERE createdBy = :userId
            ) 
            AND YEAR(createdAt) = YEAR(CURDATE()) 
            GROUP BY YEAR(createdAt), MONTH(createdAt)
        `;

        return await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: { userId }
        });
    } catch (err) {
        console.error('Error fetching monthly pool payments:', err);
        throw err;
    }
}

async function getTotalPoolPaymentByWeek(userId, weekOffset = 0) {
    try {
        const query = `
            SELECT 
                SUM(amount) AS total_contributed, 
                WEEKDAY(createdAt) AS WEEK, 
                :userId AS user_id  
            FROM pools_payments 
            WHERE poolID IN (
                SELECT id FROM pools WHERE createdBy = :userId
            ) 
            AND week(createdAt) = WEEK(current_date) - :weekOffset 
            AND YEAR(createdAt) = YEAR(current_date) 
            GROUP BY WEEKDAY(createdAt)
        `;

        return await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: { userId, weekOffset }
        });
    } catch (err) {
        console.error(`Error fetching weekly pool payments (offset ${weekOffset}):`, err);
        throw err;
    }
}

function formatTotalPoolPaymentByWeek(previousWeekData, currentWeekData) {
    try {
        const formatWeekData = (weekData, weekIndex) => {
            return Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
                const dayData = weekData.find(x => x.WEEK === i);
                return dayData
                    ? parseFloat(dayData.total_contributed) || 0
                    : 0;
            });
        };

        const previousWeekContributions = formatWeekData(previousWeekData, 0);
        const currentWeekContributions = formatWeekData(currentWeekData, 1);

        return WEEK_NAMES.map((dayName, index) => [
            dayName,
            previousWeekContributions[index],
            currentWeekContributions[index]
        ]);
    } catch (err) {
        console.error('Error formatting weekly pool payments:', err);
        throw err;
    }
}

async function authorizePoolPaymentsAccess(currentUser, paymentRecords) {
    for (const item of paymentRecords) {
        const poolPayment = new PoolsPayments();
        poolPayment.memberID = item.user_id;

        if (!authorization(currentUser, Operations.Read, poolPayment)) {
            return false;
        }
    }
    return true;
}

async function getPoolPaymentByOrderId(orderId) {
    if (!orderId) {
        throw new Error('Order ID is required');
    }

    if (typeof orderId !== 'string' && typeof orderId !== 'number') {
        throw new Error('Order ID must be a string or number');
    }

    try {
        const result = await PoolsPayments.findOne({
            attributes: [
                'status',
                'amount',
                'poolID',
                'total',
                'discount',
                'transaction_id',
                'response',
                'createdAt',
                'updatedAt'
            ],
            where: {
                order_id: orderId.toString()
            },
            raw: true
        });

        if (!result) {
            return {
                success: false,
                error: 'Payment not found',
                data: {},
                orderId: orderId.toString()
            };
        }

        return {
            success: true,
            error: {},
            data: {
                status: result.status,
                amount: result.amount,
                poolID: result.poolID,
                total: result.total,
                discount: result.discount,
                transaction_id: result.transaction_id,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
                paymentDetails: getPaymentDetails(JSON.parse(result.response))
            },
            orderId: orderId.toString()
        };

    } catch (error) {
        console.error(`Error fetching payment for order ${orderId}:`, error);

        if (error.name === 'SequelizeDatabaseError') {
            throw new Error(`Database error: ${error.message}`);
        }

        if (error.name === 'SequelizeConnectionError') {
            throw new Error('Database connection failed');
        }

        if (error.name === 'SyntaxError' && error.message.includes('JSON')) {

            throw new Error('Failed to parse response JSON');
        }

        throw new Error(`Failed to retrieve payment: ${error.message}`);
    }
}

function getDeclineReason(processorResponse) {
    if (!processorResponse) return 'No processor response';

    const code = processorResponse.response_code;
    const avsCode = processorResponse.avs_code;

    // Common PayPal/processor decline codes
    const declineReasons = {
        // Generic codes
        '0000': 'Approved',
        '0100': 'Refer to card issuer',
        '0500': 'Do not honor',
        '1200': 'Invalid transaction',
        '1300': 'Invalid amount',
        '1400': 'Invalid card number',
        '1500': 'No such issuer',
        '5100': 'Insufficient funds',
        '5200': 'No checking account',
        '5300': 'No savings account',
        '5400': 'Expired card',
        '5500': 'Incorrect PIN',
        '5700': 'Transaction not permitted',
        '5800': 'Transaction not allowed',
        '5900': 'Suspected fraud',
        '6000': 'Card acceptor contact acquirer',
        '6100': 'Exceeds withdrawal limit',
        '6200': 'Restricted card',
        '6300': 'Security violation',
        '6400': 'Original amount incorrect',
        '6500': 'Exceeds withdrawal frequency',
        '6700': 'Cardholder stopped',
        '6800': 'Card not supported',
        '6900': 'Card lost',
        '7000': 'Card stolen',

        // Specific codes from your response
        '9500': 'Declined by issuer',
        '9501': 'Invalid card number',
        '9502': 'Insufficient funds',
        '9503': 'Expired card',
        '9504': 'Invalid PIN',
        '9505': 'Card not supported',
        '9506': 'Card restricted',
        '9507': 'Card lost or stolen',
        '9508': 'Card blocked',
        '9509': 'Exceeds withdrawal limit',
    };

    // AVS codes
    const avsMessages = {
        'A': 'Address matches, ZIP does not match',
        'B': 'Address not verified (international)',
        'C': 'Non-US issuer does not support AVS',
        'D': 'Address and ZIP match (international)',
        'E': 'AVS data invalid',
        'F': 'UK-specific: address and ZIP match',
        'G': 'Non-US issuer does not support AVS',
        'I': 'AVS not verified (international)',
        'M': 'Address and ZIP match (international)',
        'N': 'Neither address nor ZIP match',
        'P': 'ZIP matches, address not verified (international)',
        'R': 'System unavailable',
        'S': 'AVS not supported',
        'U': 'AVS data unavailable',
        'W': 'ZIP matches, address does not',
        'X': 'Address and ZIP match (US)',
        'Y': 'Address and ZIP match (US)',
        'Z': 'ZIP matches, address does not'
    };

    const reason = declineReasons[code] || `Declined by processor (code: ${code})`;
    const avsMessage = avsMessages[avsCode] || `AVS code: ${avsCode}`;

    return `${reason}. ${avsMessage}`;
}

function getPaymentDetails(response) {
    try {
        const result = {
            orderId: response.id,
            intent: response.intent,
            status: response.status,
            purchaseUnits: [],
            overallStatus: 'PENDING',
            reason: null,
            errorDetails: null
        };

        // Check each purchase unit
        for (const unit of response.purchase_units) {
            const unitResult = {
                referenceId: unit.reference_id,
                amount: unit.amount.value,
                currency: unit.amount.currency_code,
                description: unit.description,
                captures: []
            };

            if (unit.payments && unit.payments.captures) {
                for (const capture of unit.payments.captures) {
                    const captureResult = {
                        id: capture.id,
                        status: capture.status,
                        amount: capture.amount.value,
                        finalCapture: capture.final_capture,
                        processorResponse: capture.processor_response,
                        sellerProtection: capture.seller_protection?.status,
                        fee: capture.seller_receivable_breakdown?.paypal_fee?.value,
                        netAmount: capture.seller_receivable_breakdown?.net_amount?.value,
                        createTime: capture.create_time,
                        updateTime: capture.update_time
                    };

                    // Get decline reason if declined
                    if (capture.status === 'DECLINED') {
                        captureResult.declineReason = getDeclineReason(capture.processor_response);
                    }

                    unitResult.captures.push(captureResult);
                }
            }

            result.purchaseUnits.push(unitResult);
        }

        // Determine overall status
        const allCaptures = result.purchaseUnits.flatMap(unit => unit.captures);
        if (allCaptures.some(c => c.status === 'DECLINED')) {
            result.overallStatus = 'DECLINED';
            result.reason = allCaptures.find(c => c.status === 'DECLINED')?.declineReason;
        } else if (allCaptures.some(c => c.status === 'COMPLETED')) {
            result.overallStatus = 'COMPLETED';
        } else if (allCaptures.some(c => c.status === 'PENDING')) {
            result.overallStatus = 'PENDING';
        }

        return result;

    } catch (error) {
        console.error('Error processing PayPal response:', error);
        return {
            overallStatus: 'ERROR',
            errorDetails: error.message
        };
    }
}



module.exports = {
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
}