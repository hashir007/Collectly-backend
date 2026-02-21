const responseHandler = require('../utils/responseHandler');
const ejs = require('ejs');
const {
    Operations,
    authorization
} = require('../utils/authorizationResourceFilter.js');
const {
    SendMail,
    SendPaymentMail
} = require("../utils/sendEmail");
const {
    fsReadFileHtml
} = require("../utils/fileHandler.js");
const {
    PoolsTypes,
    Pools,
    PoolsTypesAvaliableFormats,
    PoolsFormats,
    PoolsMembers,
    PoolsPayments,
    User,
    PoolsSettings,
    PoolsMessages,
    Notifications,
    PoolsDeleteRequests,
    PoolsRefundRequests,
    PoolsPermissions,
    PoolsEvents,
    PoolsEventTips,
    Subscriptions,
    SubscriptionsHistories,
    SubscriptionsPayments,
    UserSocialMediaLinks,
    UserSettings,
    UserReferral
} = require('../models/index.js');
const {
    findUserByIdV1,
    findUserByIdV2,
    updateProfile,
    getPayoutDetails,
    updatePayoutDetails,
    getAllContributionByUserId,
    getSubscriptionHistory,
    getSubscription,
    getSubscriptionsPayments,
    getPoolPlans,
    getSocialMediaByUserId,
    addOrUpdateSocialMediaLinks,
    getUserSettings,
    updateUserSettings,
    getMyApps,
    getUserProjectsById,
    createApp,
    getUserReferrals,
    getIdentityVerificationStatus,
    uploadProfileImage,
    updateProfileImage,
    deleteProfileImage,
    addContactUs,
    getPoolStatisticsByUserId
} = require('../services/user.service.js');
const logger = require("../utils/logger");
const exp = require('constants');



exports.GetProfile = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const account = await findUserByIdV1(userId);

        responseHandler.sendSuccessResponse(res, {
            Account: account,
        }, "Success!!!");

    }
    catch (err) {
        logger.error(`GetProfile error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.UpdateProfile = async (req, res, next) => {
    try {

        const { userId } = req.params;
        const { firstName, lastName, dateOfBirth, phone } = req.body;
        const currentUser = req.userData;

        // Find the user to update
        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Update, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        // Update the profile
        const updatedUser = await updateProfile(userId, { firstName, lastName, dateOfBirth, phone });

        responseHandler.sendSuccessResponse(res, {
            Account: updatedUser,
        }, "Profile updated successfully!");

    }
    catch (err) {
        logger.error(`UpdateProfile error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetPayoutDetails = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const payout = await getPayoutDetails(userId);

        responseHandler.sendSuccessResponse(res, {
            Payout: payout,
        }, "Success!!!");

    }
    catch (err) {
        logger.error(`GetPayoutDetails error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.UpdatePayoutDetails = async (req, res, next) => {
    try {

        const { userId } = req.params;
        const { payoutEmailAddress, payoutPayerID } = req.body;
        const currentUser = req.userData;

        // Find the user to update
        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Update, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        // Update the Payout
        const updatedPayout = await updatePayoutDetails(userId, { payoutEmailAddress, payoutPayerID });

        responseHandler.sendSuccessResponse(res, {
            Payout: updatedPayout,
        }, "Payout updated successfully!");

    }
    catch (err) {
        logger.error(`UpdatePayoutDetails error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetAllContributionByUserId = async (req, res, next) => {
    try {
        const { userId, page, pageSize } = req.params;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const contributions = await getAllContributionByUserId(userId, parseInt(page), (pageSize) ? parseInt(pageSize) : 10);

        responseHandler.sendSuccessResponse(res, {
            Contributions: contributions,
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`GetAllContributionByUserId error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetSubscriptionHistory = async (req, res, next) => {
    try {

        const { userId, page, pageSize } = req.params;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const subscriptionHistory = await getSubscriptionHistory(userId, parseInt(page), (pageSize) ? parseInt(pageSize) : 10);

        responseHandler.sendSuccessResponse(res, {
            SubscriptionHistory: subscriptionHistory,
        }, "Success!!!");

    }
    catch (err) {
        logger.error(`GetSubscriptionHistory error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetSubscription = async (req, res, next) => {
    try {

        const { userId } = req.params;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const subscription = await getSubscription(userId);

        responseHandler.sendSuccessResponse(res, {
            Subscription: subscription,
        }, "Success!!!");

    }
    catch (err) {
        logger.error(`GetSubscription error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetSubscriptionsPayments = async (req, res, next) => {
    try {

        const { userId, page, pageSize } = req.params;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const subscriptionPayment = await getSubscriptionsPayments(userId, parseInt(page), (pageSize) ? parseInt(pageSize) : 10);

        responseHandler.sendSuccessResponse(res, {
            SubscriptionPayment: subscriptionPayment,
        }, "Success!!!");

    }
    catch (err) {
        logger.error(`GetSubscriptionsPayments error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetPlans = async (req, res, next) => {
    try {

        const plans = await getPoolPlans();

        responseHandler.sendSuccessResponse(res, {
            Plans: plans,
        }, "Success!!!");

    }
    catch (err) {
        logger.error(`GetPlans error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetSocialMediaByUserId = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUser = req.userData;
        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }
        const socialMediaLinks = await getSocialMediaByUserId(userId);

        responseHandler.sendSuccessResponse(res, {
            SocialMediaLinks: socialMediaLinks,
        }, "Success!!!");

    } catch (err) {
        logger.error(`GetSocialMediaByUserId error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.AddOrUpdateSocialMediaLinks = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { social } = req.body;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Update, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const socialLinks = JSON.parse(social);

        socialLinks.map(async (item) => {
            const { link, social_media } = item;
            await addOrUpdateSocialMediaLinks(link, social_media, userId);
        });

        const updatedLinks = await getSocialMediaByUserId(userId);

        responseHandler.sendSuccessResponse(res, {
            SocialMediaLinks: updatedLinks,
        }, "Social media links updated successfully!");
    } catch (err) {
        logger.error(`AddOrUpdateSocialMediaLinks error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetUserSettings = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }
        const settings = await getUserSettings(userId);

        responseHandler.sendSuccessResponse(res, {
            Settings: settings,
        }, "Success!!!");

    } catch (err) {
        logger.error(`GetUserSettings error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.UpdateUserSettings = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { settings } = req.body;
        const currentUser = req.userData;
        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Update, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const updatedSettings = await updateUserSettings(userId, settings);

        responseHandler.sendSuccessResponse(res, {
            Settings: updatedSettings,
        }, "Settings updated successfully!");
    } catch (err) {
        logger.error(`UpdateUserSettings error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetMyApps = async (req, res, next) => {
    try {

        const { userId } = req.params;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const apps = await getMyApps(userId);

        responseHandler.sendSuccessResponse(res, {
            Apps: apps,
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`GetMyApps error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.CreateApp = async (req, res, next) => {
    try {

        const { userId } = req.params;
        const { name } = req.body;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const app = await createApp(userId, name);

        responseHandler.sendSuccessResponse(res, {
            App: app,
        }, "App created successfully!");

    }
    catch (err) {
        logger.error(`CreateApp error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetUserReferrals = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const referrals = await getUserReferrals(userId);

        responseHandler.sendSuccessResponse(res, {
            Referrals: referrals,
        }, "Success!!!");
    } catch (err) {
        logger.error(`GetUserReferrals error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetIdentityVerificationStatus = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);


        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        const IdentityVerificationStatus = await getIdentityVerificationStatus(userId);

        responseHandler.sendSuccessResponse(res, {
            IdentityVerificationStatus: IdentityVerificationStatus
        }, "Success!!!");


    } catch (err) {
        logger.error(`GetIdentityVerificationStatus error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.UploadProfileImage = async (req, res, next) => {
    try {
        const { file } = req.files || {};
        const { userId } = req.params;
        const { removePhoto } = req.body;

        const currentUser = req.userData;

        const user = await findUserByIdV2(userId);

        if (!authorization(currentUser, Operations.Update, user)) {
            return responseHandler.sendUnauthorizedResponse(res);
        }

        if (removePhoto && removePhoto === 'true') {
            const result = await updateProfileImage(userId, user?.photo_id);
            return responseHandler.sendSuccessResponse(res, {
                File: result,
            }, "Profile image removed successfully!!!");
        }

        if (!file || Object.keys(file).length === 0) {
            return responseHandler.sendBadRequestResponse(res, "No files were uploaded.");
        }

        const uploadedProfileImage = await uploadProfileImage(userId, file);

        const result = await updateProfileImage(userId, uploadedProfileImage.id);

        responseHandler.sendSuccessResponse(res, {
            Uploaded: result,
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`UploadProfileImage error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.ContactUs = async (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.id || generateRequestId(); // Assuming you have request ID tracking

    try {
        logger.info(`[${requestId}] Contact us request initiated`, {
            email: req.body.email ? maskEmail(req.body.email) : 'undefined',
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Input validation
        const { firstName, lastName, email, message } = req.body;

        // Save contact us data
        const result = await addContactUs(firstName, lastName, email, message);

        logger.info(`[${requestId}] Contact us record created`, {
            contactId: result.id,
            email: maskEmail(email),
            duration: Date.now() - startTime
        });

        // Send email notification
        try {
            const template = await fsReadFileHtml('/email_templates/contactUsTemplate.ejs');

            if (!template) {
                logger.error(`[${requestId}] Contact us email template not found`);
                throw new Error('Email template not available');
            }

            const mailBody = ejs.render(template, {
                ...result,
                firstName: firstName,
                lastName: lastName,
                email: email,
                message: message,
                receivedAt: new Date().toLocaleString(),
                supportEmail: process.env.SUPPORT_EMAIL || 'support@chipinpool.com'
            });

            const emailConfiguration = {
                from: `ChipInPool Contact <${process.env.EMAIL1_USERNAME}>`,
                to: process.env.CONTACT_RECIPIENT || process.env.EMAIL1_USERNAME, // Use separate email for contacts if needed
                subject: `New Contact Form Submission from ${firstName} ${lastName}`,
                html: mailBody,
                replyTo: email, // Allow replying directly to the user
                headers: {
                    'X-Request-ID': requestId,
                    'X-Priority': '1',
                    'Importance': 'high'
                }
            };

            await SendMail(emailConfiguration);

            logger.info(`[${requestId}] Contact us email sent successfully`, {
                contactId: result.id,
                recipient: process.env.CONTACT_RECIPIENT ? 'custom' : 'default',
                duration: Date.now() - startTime
            });

        } catch (emailErr) {
            logger.error(`[${requestId}] Failed to send contact us email: ${emailErr.message}`, {
                stack: emailErr.stack,
                contactId: result.id,
                email: maskEmail(email)
            });
            // Don't return error to user if email fails - the contact was still saved
        }

        logger.info(`[${requestId}] Contact us request completed successfully`, {
            contactId: result.id,
            totalDuration: Date.now() - startTime
        });

        responseHandler.sendSuccessResponse(res, {
            contactId: result.id,
            message: "Your message has been sent successfully. We will get back to you shortly."
        }, "Thank you for contacting us!");

    } catch (err) {
        logger.error(`[${requestId}] ContactUs error: ${err.message}`, {
            stack: err.stack,
            duration: Date.now() - startTime,
            email: req.body.email ? maskEmail(req.body.email) : 'undefined'
        });

        // Handle specific error types
        if (err.name === 'ValidationError') {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }

        if (err.code === 'EMAIL_SERVICE_UNAVAILABLE') {
            return responseHandler.sendServiceUnavailableResponse(res,
                "We're experiencing technical difficulties. Your message has been received but we couldn't send a confirmation email. We'll contact you soon."
            );
        }

        // Database errors
        if (err.code === 'ER_DUP_ENTRY') {
            return responseHandler.sendBadRequestResponse(res,
                "It seems you've already submitted a similar message recently. Please wait a while before submitting again."
            );
        }

        responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.GetPoolStatisticsByUserId = async (req, res, next) => {
    try {
        const userId = req.params.userId || req.user.id;
        const { preset } = req.query; // Accept preset parameter

        const stats = await getPoolStatisticsByUserId(userId, {
            preset: preset || null // 'This Week', 'Last Week', etc.
        });

        return responseHandler.sendSuccessResponse(res, {
            Statistics: stats,
        }, "Success!!!");

    } catch (error) {
        logger.error(`GetPoolStatisticsByUserId error: ${error.message}`, { stack: error.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

function maskEmail(email) {
    if (!email) return 'undefined';
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return 'invalid';

    const maskedLocal = localPart.length > 2
        ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
        : '*'.repeat(localPart.length);

    return `${maskedLocal}@${domain}`;
}

function maskToken(token) {
    if (!token || token.length < 8) return 'invalid';
    return token.substring(0, 4) + '***' + token.substring(token.length - 4);
}

function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}