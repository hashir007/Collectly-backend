"use strict";
require('dotenv').config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL1_USERNAME,
        pass: process.env.EMAIL1_PASSWORD,
    },
});

const transporterPayment = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL2_USERNAME,
        pass: process.env.EMAIL2_PASSWORD,
    },
});

exports.SendMail = async (mailConfigurations) => {
    await transporter.sendMail(mailConfigurations, function (error, info) {
        if (error) { console.log(Error(error)); }
        console.log('Email Sent Successfully');
        console.log(info);
    });
}

exports.SendPaymentMail = async (mailConfigurations) => {
    await transporterPayment.sendMail(mailConfigurations, function (error, info) {
        if (error) { console.log(Error(error)); }
        console.log('Email Sent Successfully');
        console.log(info);
    });
}


