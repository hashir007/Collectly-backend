const responseHandler = require('./responseHandler.js');
const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const { SendMail } = require("./sendEmail.js");
const moment = require('moment');
const multer = require("multer");
const path = require("path");
var Axios = require("axios");
const qs = require('querystring');

const {
    PoolsPlans
} = require('../models/index.js');
const fs = require('fs');
var ejs = require('ejs');

class PayPalInterface {

    getToken = async () => {
        if (!this._token ||
            this._token.expires_in + this._token.created >= new Date().getTime()) {
            const url = process.env.PAYPAL_URL + '/v1/oauth2/token'
            const headers = {
                'Accept': 'application/json',
                'Accept-Language': 'en_US',
                'content-type': 'application/x-www-form-urlencoded',
            }
            const auth = {
                'username': process.env.PAYPAL_CLIENT_ID,
                'password': process.env.PAYPAL_SECRET_ID
            }
            try {

                const resp = await Axios.post(url,
                    qs.stringify({ grant_type: 'client_credentials' }),
                    { headers, auth }
                );
                this._token = resp.data;
                this._token.created = new Date().getTime();
            } catch (e) {
                console.log(e)
            }
        }
        return this._token;
    }

    listPlans = async () => {
        const url = process.env.PAYPAL_URL + '/v1/billing/plans'
        const headers = {
            'Authorization': `Bearer ${this._token.access_token}`,
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'content-type': 'application/json',
            'Prefer': 'return=representation'
        }

        try {
            const resp = await Axios.get(url + "?status=ACTIVE", { headers });

            return resp.data;

        } catch (e) {
            console.log(e)
        }

    }

    createProduct = async (name, description) => {
        const url = process.env.PAYPAL_URL + '/v1/catalogs/products'
        const headers = {
            'Authorization': `Bearer ${this._token.access_token}`,
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'content-type': 'application/json',
            'Prefer': 'return=representation'
        }
        try {
            const resp = await Axios.post(url,
                JSON.stringify(
                    {
                        "name": name,
                        "description": description,
                        "type": "SERVICE",
                        "category": "SOFTWARE",
                        "image_url": "https://chip.collectly.com/assets/img/logo-2.png",
                        "home_url": "http://collectly.com/"
                    }),
                { headers }
            );

            return resp.data;

        } catch (e) {
            console.log(e)
        }

    }

    listProducts = async () => {
        const url = process.env.PAYPAL_URL + '/v1/catalogs/products'
        const headers = {
            'Authorization': `Bearer ${this._token.access_token}`,
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'content-type': 'application/json',
            'Prefer': 'return=representation'
        }
        try {
            const resp = await Axios.get(url,
                { headers }
            );

            return resp.data;

        } catch (e) {
            console.log(e)
        }
    }

    createPlans = async (price, name, description, id, type) => {
        const url = process.env.PAYPAL_URL + '/v1/billing/plans'
        const headers = {
            'Authorization': `Bearer ${this._token.access_token}`,
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'content-type': 'application/json',
            'Prefer': 'return=representation'
        }

        try {
            const resp = await Axios.post(url,
                JSON.stringify(
                    {
                        "product_id": id,
                        "name": name,
                        "description": description,
                        "status": "ACTIVE",
                        "billing_cycles": [
                            {
                                "frequency": { "interval_unit": type, "interval_count": 1 },
                                "tenure_type": "REGULAR",
                                "sequence": 1,
                                "total_cycles": 0,
                                "pricing_scheme": { "fixed_price": { "value": price, "currency_code": "USD" } }
                            }],
                        "payment_preferences": {
                            "auto_bill_outstanding": true,
                            "payment_failure_threshold": 3
                        }
                    }),
                { headers }
            );

            return resp.data;

        } catch (e) {
            console.log(e)
        }

    }

    setupPaypal = async () => {

        console.log('START PAYPAL PLANS SETUP');

        console.log('FETCHING TOKEN START');

        await this.getToken();

        console.log('FETCHING TOKEN END');

        if (this._token) {

            console.log('START FETCH DATABASE PLANS');

            var dbPlans = await PoolsPlans.findAll({
                where: {
                    paypalPlanId: {
                        [Op.is]: null
                    }
                }
            });

            console.log('DATABASE PLANS WHERE PLAN ID DOES NOT EXISTS = ' + dbPlans.length);

            console.log('END FETCH DATABASE PLANS');

            if (dbPlans.length > 0) {

                console.log('FETCH PAYPAL PLANS START');

                var paypalPlans = await this.listPlans();

                console.log('PAYPAL PLANS = ' + paypalPlans.plans.length);

                console.log('FETCH PAYPAL PLANS END');

                dbPlans.forEach(async (dbplan) => {

                    console.log('CHECKING DATABASE PLANS FOR =' + dbplan.name);

                    if (paypalPlans.plans.filter(x => x.name == dbplan.name && x.status == 'ACTIVE').length == 0) {

                        console.log('DATABASE PLAN DOES NOT EXISTS ON PAYPAL');

                        var paypalProducts = await this.listProducts();

                        console.log('PRODUCTS ON PAYPAL = ' + paypalProducts.products.length);

                        if (paypalProducts.products.filter(x => x.name == dbplan.name).length == 0) {

                            console.log('PRODUCT DOES NOT EXISTS ON PAYPAL')

                            var result = await this.createProduct(dbplan.name, dbplan.description);

                            console.log('CREATED PRODUCT ON PAYPAL')

                            await this.createPlans(dbplan.price, dbplan.name, dbplan.description, result.id, dbplan.type);

                            console.log('CREATED PLAN ON PAYPAL')

                        } else {

                            console.log('PRODUCT EXISTS ON PAYPAL')

                            this.createPlans(dbplan.price, dbplan.name, dbplan.description, paypalProducts.products.find(x => x.name == dbplan.name).id, dbplan.type);

                            console.log('CREATED PLAN ON PAYPAL')
                        }


                        console.log('CHECKING PLANS ON PAYPAL');

                        paypalPlans = await this.listPlans();

                        var planId = paypalPlans.plans.find(x => x.name == dbplan.name && x.status == 'ACTIVE').id;

                        console.log('FETCHING PLAN ID =' + planId)

                        await PoolsPlans.update({ paypalPlanId: planId },
                            { where: { name: dbplan.name }, individualHooks: true }
                        );

                        console.log('PLAN ID UPDATED TO DATABASE PLAN');

                    } else {

                        console.log('DATABASE PLAN DOES EXISTS ON PAYPAL');

                        var planId = paypalPlans.plans.find(x => x.name == dbplan.name && x.status == 'ACTIVE').id;

                        console.log('FETCHING PLAN ID =' + planId)

                        await PoolsPlans.update({ paypalPlanId: planId },
                            { where: { name: dbplan.name }, individualHooks: true }
                        );

                        console.log('PLAN ID UPDATED TO DATABASE PLAN')
                    }
                });
            }


        }

        console.log('END PAYPAL PLANS SETUP');
    }
}

module.exports = PayPalInterface;
