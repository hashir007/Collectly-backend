require('dotenv').config();
var api = require('../node_modules/clicksend/api.js');

exports.SendSMS = async (to, message) => {

    var smsMessage = new api.SmsMessage();
    smsMessage.from = process.env.SMS_API_FROM;
    smsMessage.to = to;
    smsMessage.body = message;

    var smsApi = new api.SMSApi(process.env.SMS_API_USERNAME, process.env.SMS_API_KEY);
    var smsCollection = new api.SmsMessageCollection();
    smsCollection.messages = [smsMessage];

    await smsApi.smsSendPost(smsCollection).then(function (response) {
        console.log(response.body);
    }).catch(function (err) {
        console.error(err.body);
    });

}