const responseHandler = require('../utils/responseHandler');
const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const {
    createPaypalSubscription,
    capturePaypalSubscription,
    getSubscriptionDetails,
    cancelSubscription
} = require('../services/subscription.service');
const {
    User,
    Subscriptions,
    SubscriptionsHistories,
    SubscriptionsPayments,
    PoolsPlans
} = require('../models');

exports.createSubscription = async (req, res, next) => {
    try {
        const { planId, subscriptionAmount, finalAmount, discount, type } = req.body;
        const userId = req.user.id;

        if (!planId || !subscriptionAmount) {
            return responseHandler.error(res, "Plan ID and subscription amount are required", 400);
        }

        const existingSubscription = await Subscriptions.findOne({
            where: {
                user_id: userId,
                status: { [Op.in]: ['ACTIVE', 'PENDING'] }
            }
        });

        if (existingSubscription) {
            return responseHandler.error(res, "You already have an active subscription", 400);
        }

        const plan = await PoolsPlans.findByPk(planId);
        if (!plan) {
            return responseHandler.error(res, "Subscription plan not found", 404);
        }

        const paypalResponse = await createPaypalSubscription({
            planId: plan.paypal_plan_id,
            subscriptionAmount,
            finalAmount,
            discount,
            userId,
            customId: `subscription_${planId}_user_${userId}_${Date.now()}`
        });

        const subscription = await Subscriptions.create({
            user_id: userId,
            plan_id: planId,
            paypal_subscription_id: paypalResponse.subscriptionId,
            status: paypalResponse.status,
            amount: subscriptionAmount,
            final_amount: finalAmount,
            discount: discount || 0,
            start_date: new Date(),
            paypal_data: paypalResponse.details
        });

        await SubscriptionsHistories.create({
            subscription_id: subscription.id,
            status: paypalResponse.status,
            paypal_data: paypalResponse.details,
            created_at: new Date()
        });

        responseHandler.success(res, {
            subscriptionId: paypalResponse.subscriptionId,
            approvalUrl: paypalResponse.approvalUrl,
            status: paypalResponse.status,
            subscription: subscription
        }, "Subscription created successfully");

    } catch (err) {
        logger.error(`CreateSubscription error: ${err.message}`, { stack: err.stack });
        responseHandler.error(res, err.message || "Failed to create subscription", 500);
    }
}

exports.captureSubscription = async (req, res, next) => {
    try {
        const { subscriptionId, planId, type } = req.body;
        const userId = req.user.id;

        if (!subscriptionId) {
            return responseHandler.error(res, "Subscription ID is required", 400);
        }

        const subscription = await Subscriptions.findOne({
            where: {
                paypal_subscription_id: subscriptionId,
                user_id: userId
            }
        });

        if (!subscription) {
            return responseHandler.error(res, "Subscription not found", 404);
        }

        const captureResponse = await capturePaypalSubscription(subscriptionId);

        await Subscriptions.update({
            status: captureResponse.status,
            paypal_data: captureResponse.details,
            updated_at: new Date()
        }, {
            where: { id: subscription.id }
        });

        await SubscriptionsHistories.create({
            subscription_id: subscription.id,
            status: captureResponse.status,
            paypal_data: captureResponse.details,
            created_at: new Date()
        });

        if (captureResponse.billingInfo) {
            await SubscriptionsPayments.create({
                subscription_id: subscription.id,
                amount: subscription.final_amount,
                paypal_payment_id: captureResponse.billingInfo.last_payment?.id,
                payment_date: new Date(),
                status: 'COMPLETED',
                paypal_data: captureResponse.billingInfo
            });
        }

        await User.update({
            plan_id: subscription.plan_id,
            subscription_id: subscription.id
        }, {
            where: { id: userId }
        });

        responseHandler.success(res, {
            subscriptionId: captureResponse.subscriptionId,
            status: captureResponse.status,
            billingInfo: captureResponse.billingInfo
        }, "Subscription activated successfully");

    } catch (err) {
        logger.error(`CaptureSubscription error: ${err.message}`, { stack: err.stack });
        responseHandler.error(res, err.message || "Failed to activate subscription", 500);
    }
}

exports.getSubscriptionDetails = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const userId = req.user.id;

        if (!subscriptionId) {
            return responseHandler.error(res, "Subscription ID is required", 400);
        }

        const subscription = await Subscriptions.findOne({
            where: {
                paypal_subscription_id: subscriptionId,
                user_id: userId
            },
            include: [
                {
                    model: PoolsPlans,
                    as: 'plan',
                    attributes: ['id', 'name', 'description', 'price', 'type']
                },
                {
                    model: SubscriptionsHistories,
                    as: 'histories',
                    order: [['created_at', 'DESC']],
                    limit: 10
                },
                {
                    model: SubscriptionsPayments,
                    as: 'payments',
                    order: [['payment_date', 'DESC']],
                    limit: 10
                }
            ]
        });

        if (!subscription) {
            return responseHandler.error(res, "Subscription not found", 404);
        }

        const paypalDetails = await getSubscriptionDetails(subscriptionId);

        responseHandler.success(res, {
            subscription: subscription,
            paypalDetails: paypalDetails
        }, "Subscription details retrieved successfully");

    } catch (err) {
        logger.error(`GetSubscriptionDetails error: ${err.message}`, { stack: err.stack });
        responseHandler.error(res, err.message || "Failed to get subscription details", 500);
    }
}

exports.cancelSubscription = async (req, res, next) => {
    try {
        const { subscriptionId, reason } = req.body;
        const userId = req.user.id;

        if (!subscriptionId) {
            return responseHandler.error(res, "Subscription ID is required", 400);
        }

        const subscription = await Subscriptions.findOne({
            where: {
                paypal_subscription_id: subscriptionId,
                user_id: userId
            }
        });

        if (!subscription) {
            return responseHandler.error(res, "Subscription not found", 404);
        }

        const cancelResponse = await cancelSubscription(subscriptionId);

        await Subscriptions.update({
            status: 'CANCELLED',
            end_date: new Date(),
            paypal_data: cancelResponse,
            updated_at: new Date()
        }, {
            where: { id: subscription.id }
        });

        await SubscriptionsHistories.create({
            subscription_id: subscription.id,
            status: 'CANCELLED',
            paypal_data: cancelResponse,
            created_at: new Date()
        });

        const freePlan = await PoolsPlans.findOne({
            where: { type: 'FREE' }
        });

        if (freePlan) {
            await User.update({
                plan_id: freePlan.id,
                subscription_id: null
            }, {
                where: { id: userId }
            });
        }

        responseHandler.success(res, {
            subscriptionId: subscriptionId,
            status: 'CANCELLED'
        }, "Subscription cancelled successfully");

    } catch (err) {
        logger.error(`CancelSubscription error: ${err.message}`, { stack: err.stack });
        responseHandler.error(res, err.message || "Failed to cancel subscription", 500);
    }
}

exports.getCurrentSubscription = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const subscription = await Subscriptions.findOne({
            where: {
                user_id: userId,
                status: { [Op.in]: ['ACTIVE', 'PENDING'] }
            },
            include: [
                {
                    model: PoolsPlans,
                    as: 'plan',
                    attributes: ['id', 'name', 'description', 'price', 'type', 'features']
                },
                {
                    model: SubscriptionsHistories,
                    as: 'histories',
                    order: [['created_at', 'DESC']],
                    limit: 5
                },
                {
                    model: SubscriptionsPayments,
                    as: 'payments',
                    order: [['payment_date', 'DESC']],
                    limit: 5
                }
            ],
            order: [['created_at', 'DESC']]
        });

        if (!subscription) {
            return responseHandler.success(res, null, "No active subscription found");
        }

        try {
            const paypalDetails = await getSubscriptionDetails(subscription.paypal_subscription_id);
            subscription.paypal_data = paypalDetails;
            subscription.status = paypalDetails.status;

            if (subscription.status !== paypalDetails.status) {
                await Subscriptions.update(
                    { status: paypalDetails.status },
                    { where: { id: subscription.id } }
                );
            }
        } catch (paypalError) {
            logger.error(`PayPal details fetch error: ${paypalError.message}`);
        }

        responseHandler.success(res, subscription, "Current subscription retrieved successfully");

    } catch (err) {
        logger.error(`GetCurrentSubscription error: ${err.message}`, { stack: err.stack });
        responseHandler.error(res, err.message || "Failed to get current subscription", 500);
    }
}

exports.getUserSubscriptions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;

        const { count, rows: subscriptions } = await Subscriptions.findAndCountAll({
            where: { user_id: userId },
            include: [
                {
                    model: PoolsPlans,
                    as: 'plan',
                    attributes: ['id', 'name', 'description', 'price', 'type']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        responseHandler.success(res, {
            subscriptions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        }, "User subscriptions retrieved successfully");

    } catch (err) {
        logger.error(`GetUserSubscriptions error: ${err.message}`, { stack: err.stack });
        responseHandler.error(res, err.message || "Failed to get user subscriptions", 500);
    }
}