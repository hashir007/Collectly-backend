const responseHandler = require('../utils/responseHandler');
const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const { SendMail } = require("../utils/sendEmail");
const crypto = require('crypto');
const moment = require('moment');
const multer = require("multer");
const fs = require('fs').promises;
const path = require("path");
const {
    fsReadFileHtml
} = require("../utils/fileHandler.js");
const {
    User,
    ContactUs,
    Notifications,
    Files,
    PoolsPlans,
    Subscriptions,
    SubscriptionsHistories,
    SubscriptionsPayments,
    UserSocialMediaLinks,
    UserSettings,
    UserReferral,
    PoolsPayments,
    Pools,
    UserProjects
} = require('../models');





async function getAccessToken() {
    try {
        const auth = Buffer.from(process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_SECRET_ID).toString("base64");
        const url = `${process.env.PAYPAL_URL}/v1/oauth2/token`;
        const headers = {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        const response = await Axios.post(
            url,
            qs.stringify({ grant_type: 'client_credentials' }),
            { headers }
        );

        return response.data.access_token;
    } catch (error) {
        console.error('Error getting PayPal access token:', error.response?.data || error.message);
        throw new Error('Failed to get PayPal access token');
    }
}



async function createPaypalSubscription(planData) {
    try {
        const {
            planId,
            subscriptionAmount,
            finalAmount,
            discount,
            userId,
            customId
        } = planData;

        const accessToken = await this.getAccessToken();
        const url = `${process.env.PAYPAL_URL}/v1/billing/subscriptions`;

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };

        // Create subscription payload according to PayPal API
        const subscriptionPayload = {
            plan_id: planId,
            custom_id: customId || `user_${userId}_subscription`,
            application_context: {
                brand_name: "Your App Name",
                locale: "en-US",
                shipping_preference: "NO_SHIPPING",
                user_action: "SUBSCRIBE_NOW",
                payment_method: {
                    payer_selected: "PAYPAL",
                    payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
                },
                return_url: `${process.env.CLIENT_URL}/subscription/success`,
                cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`
            }
        };

        const response = await Axios.post(url, subscriptionPayload, { headers });

        return {
            subscriptionId: response.data.id,
            status: response.data.status,
            approvalUrl: response.data.links.find(link => link.rel === 'approve').href,
            details: response.data
        };

    } catch (error) {
        console.error('Error creating PayPal subscription:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create subscription');
    }
}

async function capturePaypalSubscription(subscriptionId) {
    try {
        const accessToken = await this.getAccessToken();
        const url = `${process.env.PAYPAL_URL}/v1/billing/subscriptions/${subscriptionId}/capture`;

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };

        const response = await Axios.post(url, {}, { headers });

        return {
            subscriptionId: response.data.id,
            status: response.data.status,
            billingInfo: response.data.billing_info,
            details: response.data
        };

    } catch (error) {
        console.error('Error capturing PayPal subscription:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to capture subscription');
    }
}

async function getSubscriptionDetails(subscriptionId) {
    try {
        const accessToken = await this.getAccessToken();
        const url = `${process.env.PAYPAL_URL}/v1/billing/subscriptions/${subscriptionId}`;

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };

        const response = await Axios.get(url, { headers });
        return response.data;

    } catch (error) {
        console.error('Error getting subscription details:', error.response?.data || error.message);
        throw new Error('Failed to get subscription details');
    }
}

async function cancelSubscription(subscriptionId) {
    try {
        const accessToken = await this.getAccessToken();
        const url = `${process.env.PAYPAL_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`;

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };

        const response = await Axios.post(url, { reason: "User requested cancellation" }, { headers });
        return response.data;

    } catch (error) {
        console.error('Error canceling subscription:', error.response?.data || error.message);
        throw new Error('Failed to cancel subscription');
    }
}





module.exports = {
    createPaypalSubscription,
    capturePaypalSubscription,
    getSubscriptionDetails,
    cancelSubscription
};