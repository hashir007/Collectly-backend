const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const { SendMail, SendPaymentMail } = require("../utils/sendEmail.js");
const { SendSMS } = require('../utils/sendSMS.js');

const {
    User,
    UserSettings,
    Notifications
} = require('../models/index.js');



async function SendEmailNotification(forceNotificationCheck, userId, to, subject, body) {
    try {

        let doSend = true;

        if (forceNotificationCheck) {
            let isEnabled = await checkIfUserEnabledEmailNotification(userId);
            doSend = isEnabled;
        }

        if (doSend) {

            let emailConfiguration = {
                from: `ChipInPool <${process.env.EMAIL1_USERNAME}>`,
                to: to,
                subject: subject,
                html: body
            };

            await SendMail(emailConfiguration);
        }
    }
    catch (err) {
        console.log(err)
    }
}

async function SendSMSNotification(forceNotificationCheck, userId, to, message) {
    try {

        let doSend = true;

        if (forceNotificationCheck) {
            let isEnabled = await checkIfUserEnabledSMSNotification(userId);
            doSend = isEnabled;
        }

        if (doSend) {
            if (to) {
                await SendSMS(`+${to}`, message);
            }
        }

    }
    catch (err) {
        console.log(err)
    }
}

async function SendAppNotification(userId, message) {
    try {
        var currentDateTime = new Date(new Date().toUTCString());
        await Notifications.create({
            userToNotify: userId,
            isRead: false,
            message: message,
            createdAt: currentDateTime,
            updatedAt: currentDateTime
        });

        console.log(`App notification created for user ${userId}: ${message}`);
    }
    catch (err) {
        console.log('Error creating app notification:', err);
        throw err; // Re-throw to handle in calling function
    }
}

async function checkIfUserEnabledEmailNotification(userId) {

    let isEnabled = true;

    try {

        let user = await User.findOne({
            include: [{
                model: UserSettings,
                required: false
            }],
            where: {
                id: {
                    [Op.eq]: userId,
                },
            }
        });

        if (user) {

            if (user.UserSettings.length > 0) {

                let settings = user.UserSettings[0];

                if (!settings.notification_email) {
                    isEnabled = false;
                }
            }
        }

    }
    catch (err) {
        console.log(err)
    }

    return isEnabled;
}

async function checkIfUserEnabledSMSNotification(userId) {

    let isEnabled = true;

    try {

        let user = await User.findOne({
            include: [{
                model: UserSettings,
                required: false
            }],
            where: {
                id: {
                    [Op.eq]: userId,
                },
            }
        });

        if (user) {

            if (user.UserSettings.length > 0) {

                let settings = user.UserSettings[0];

                if (!settings.notification_sms) {
                    isEnabled = false;
                }
            }
        }

    }
    catch (err) {
        console.log(err)
    }

    return isEnabled;
}

async function GetNotifications(userId, isRead, page = 1, pageSize = 5) {
    try {
        const offset = (page - 1) * pageSize;

        const whereCondition = {
            userToNotify: {
                [Op.eq]: userId,
            }
        };

        if (isRead !== undefined && isRead !== null) {
            whereCondition.isRead = {
                [Op.eq]: isRead,
            };
        }

        const result = await Notifications.findAndCountAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: offset
        });

        return {
            notifications: result.rows,
            pagination: {
                currentPage: page,
                pageSize: pageSize,
                totalItems: result.count,
                totalPages: Math.ceil(result.count / pageSize),
                hasNextPage: page * pageSize < result.count,
                hasPreviousPage: page > 1
            }
        };
    }
    catch (err) {
        throw err;
    }
}

async function MarkNotificationsAsRead(notificationId) {
    try {
        await Notifications.update(
            { isRead: true },
            {
                where: {
                    id: notificationId
                }
            }
        );
    }
    catch (err) {
        throw err;
    }
}

async function GetNotificationById(notificationId) {
    try {
        const notification = await Notifications.findOne({
            where: {
                id: {
                    [Op.eq]: notificationId,
                }
            }
        });
        return notification;
    }
    catch (err) {
        throw err;
    }
}

async function DeleteNotification(notificationId) {
    try {
        await Notifications.destroy({
            where: {
                id: {
                    [Op.eq]: notificationId,
                }
            }
        });
    }
    catch (err) {
        throw err;
    }
}


module.exports = {
    SendEmailNotification,
    SendSMSNotification,
    SendAppNotification,
    GetNotifications,
    MarkNotificationsAsRead,
    GetNotificationById,
    DeleteNotification
};