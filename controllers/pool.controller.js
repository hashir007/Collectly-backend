const responseHandler = require('../utils/responseHandler.js');
const ejs = require('ejs');
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
    UserReferral
} = require('../models/index.js');
const {
    getPoolByID,
    getPoolByIDV2,
    filterPools,
    checkIfUserIsMemberOfPool,
    filterPoolMembers,
    makeMemberPoolAdmin,
    getPoolMembersWithGoalAmount,
    getPoolMembers,
    addPoolJoiningRequests,
    getPoolJoinRequests,
    getJoinPoolDetails,
    getPoolJoiningRequestExisting,
    updatePoolJoiningRequest,
    getPoolJoiningRequestById,
    uploadPoolImage,
    updatePool,
    poolDeleteRequest,
    createPool,
    addMemberToPool,
    recordUserReferral,
    getUserPoolCount
} = require('../services/pool.service.js');
const {
    findUserByIdV2,
    getUserByReferral,
    addUserReferrals
} = require('../services/user.service.js');
const smsTemplate = require('../sms_templates/messages.json');
const {
    SendEmailNotification,
    SendSMSNotification,
    SendAppNotification
} = require("../services/notification.service.js");
const {
    submitReport
} = require('../services/poolReport.service.js');
const poolMemberService = require('../services/poolMember.service.js');

const logger = require("../utils/logger");




exports.GetDefaultSettings = async (req, res, next) => {
    try {
        const settings = {
            "language": "en",
            "currency": "USD",
            "timezone": "UTC",
            "pool": {
                "minimum_buy_amount": 5,
                "pool_image": `${process.env.BASE_URL}/assets/img/pool-thumbnails/pool-1.png`,
            },
            "paypal": {
                "client_id": process.env.PAYPAL_CLIENT_ID || "",
                "merchant_id": process.env.PAYPAL_MERCHANT_ID || "",
                "components": process.env.PAYPAL_COMPONENTS || "buttons",
            },
            "user": {
                "profile_image": `${process.env.BASE_URL}/assets/img/user.png`,
            }
        };

        return responseHandler.sendSuccessResponse(res, {
            Default: settings
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`GetDefaultSettings error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetPoolByID = async (req, res, next) => {
    try {

        const { id } = req.params;

        const currentUser = req.userData;

        let pool = await getPoolByID(id);

        if (!pool) {
            logger.error(`Pool with ID ${id} not found`);
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }

        const isMember = await checkIfUserIsMemberOfPool(currentUser.id, pool.id);
        if (!isMember) {
            logger.warn(`User ${currentUser.id} is not a member of pool ${pool.id}`);
            return responseHandler.sendUnauthorizedResponse(res, "You are not a member of this pool");
        }

        logger.info(`Pool with ID ${id} retrieved successfully for user ${currentUser.id}`);

        return responseHandler.sendSuccessResponse(res, {
            Pool: pool,
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`Login error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.FilterPools = async (req, res, next) => {
    try {
        const currentUser = req.userData;
        const { term } = req.query;
        const { page, pageSize } = req.params;
        const { joined, owner, closed, opened, orderBy } = req.body;

        logger.info(`Filtering pools for user ${currentUser.id} with term: ${term}, page: ${page}, pageSize: ${pageSize}, joined: ${joined}, owner: ${owner}, closed: ${closed}, opened: ${opened}, orderBy: ${orderBy}`);

        responseHandler.sendSuccessResponse(res, {
            Pools: await filterPools(page, pageSize, term, joined, owner, closed, opened, orderBy, currentUser.id),
        }, "Success!!!");

    }
    catch (err) {
        logger.error(`Login error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.FilterPoolMembers = async (req, res, next) => {
    try {
        const { term } = req.query;
        const { id } = req.params;
        const filters = req.body;

        logger.info(`Filtering members for pool ${id} with filters: ${JSON.stringify(filters)}`);

        const members = await filterPoolMembers(term, filters, id);

        if (!members || members.length === 0) {
            logger.warn(`No members found for pool ${id} with filters: ${JSON.stringify(filters)}`);
            return responseHandler.sendSuccessResponse(res, {
                Members: members,
            }, "Success!!!");
        }

        logger.info(`Members filtered successfully for pool ${id}`);
        return responseHandler.sendSuccessResponse(res, {
            Members: members,
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`Error filtering pool members: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.MakeMemberPoolAdmin = async (req, res, next) => {
    try {

        const { id, memberID } = req.params;

        const currentUser = req.userData;

        let pool = await getPoolByIDV2(id);

        if (!authorization(currentUser, Operations.Update, pool)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        responseHandler.sendSuccessResponse(res, {
            IsAdmin: await makeMemberPoolAdmin(id, memberID),
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`MakeMemberPoolAdmin error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetPoolMembersWithGoalAmount = async (req, res, next) => {
    try {
        const { id } = req.params;

        const currentUser = req.userData;

        let poolMembers = await getPoolMembers(id);

        if (!authorization(currentUser, Operations.Read, poolMembers)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const members = await getPoolMembersWithGoalAmount(id);

        if (!members || members.length === 0) {
            logger.warn(`No members found for pool ${id} with goal amount`);
            return responseHandler.sendSuccessResponse(res, {
                Members: members,
            }, "Success!!!");
        }

        logger.info(`Members with goal amount retrieved successfully for pool ${id}`);
        return responseHandler.sendSuccessResponse(res, {
            Members: members,
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`GetPoolMembersWithGoalAmount error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.InviteNotification = async (req, res, next) => {
    try {
        const { recipients, returnUrl } = req.body;
        const { id, mode } = req.params;
        const currentUser = req.userData;

        // Validate inputs
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            logger.warn(`No recipients provided for pool ${id} by user ${currentUser.id}`);
            return responseHandler.sendBadRequestResponse(res, "No recipients provided");
        }

        if (!id) {
            return responseHandler.sendBadRequestResponse(res, "Pool ID is required");
        }

        // Get pool information
        let pool = await getPoolByIDV2(id);
        if (!pool) {
            logger.error(`Pool with ID ${id} not found`);
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }

        // Check authorization
        if (!authorization(currentUser, Operations.Update, pool)) {
            logger.warn(`User ${currentUser.id} is not authorized to send invites for pool ${id}`);
            return responseHandler.sendUnauthorizedResponse(res, "You are not authorized to send invites for this pool");
        }

        // Get current user details for notification
        const user = await User.findOne({
            where: { id: currentUser.id }
        });

        if (!user) {
            logger.error(`User ${currentUser.id} not found`);
            return responseHandler.sendNotFoundResponse(res, "User not found");
        }

        let sentResults = [];

        // Process notifications based on mode
        if (mode === 'sms') {
            // Send SMS notifications
            for (const to of recipients) {
                try {
                    let smsBody = smsTemplate.POOL_INVITATION
                        .replace('{0}', `${pool.name}`)
                        .replace('{1}', `${user.firstName} ${user.lastName}`)
                        .replace('{2}', returnUrl);

                    await SendSMSNotification(false, 0, to, smsBody);
                    sentResults.push({ recipient: to, type: 'sms', success: true });
                    logger.info(`SMS invitation sent to ${to} for pool ${id}`);
                } catch (smsErr) {
                    logger.error(`Failed to send SMS to ${to}: ${smsErr.message}`);
                    sentResults.push({ recipient: to, type: 'sms', success: false, error: smsErr.message });
                }
            }
        } else if (mode === 'email') {
            // Send Email notifications
            const template = await fsReadFileHtml('/email_templates/invitePoolMemberTemplate.ejs');

            for (const to of recipients) {
                try {
                    let mailBody = ejs.render(template, {
                        pool: pool,
                        referrer: user,
                        inviteLink: returnUrl
                    });

                    await SendEmailNotification(false, 0, to, `Invitation to join ${pool.name}`, mailBody);
                    sentResults.push({ recipient: to, type: 'email', success: true });
                    logger.info(`Email invitation sent to ${to} for pool ${id}`);
                } catch (emailErr) {
                    logger.error(`Failed to send email to ${to}: ${emailErr.message}`);
                    sentResults.push({ recipient: to, type: 'email', success: false, error: emailErr.message });
                }
            }
        } else {
            // Invalid mode
            logger.warn(`Invalid notification mode: ${mode} for pool ${id}`);
            return responseHandler.sendBadRequestResponse(res, "Invalid notification mode. Use 'sms' or 'email'");
        }

        // Calculate success rate
        const successfulSends = sentResults.filter(result => result.success).length;
        const totalSends = sentResults.length;

        logger.info(`Invite notifications completed for pool ${id}: ${successfulSends}/${totalSends} successful`);

        responseHandler.sendSuccessResponse(res, {
            Sent: {
                total: totalSends,
                successful: successfulSends,
                failed: totalSends - successfulSends,
                results: sentResults
            },
        }, `Invitations sent: ${successfulSends} successful, ${totalSends - successfulSends} failed`);

    } catch (err) {
        logger.error(`InviteNotification error: ${err.message}`, { stack: err.stack });
        responseHandler.sendInternalServerErrorResponse(res, "Failed to send invitations");
    }
}

exports.RequestToJoinPool = async (req, res, next) => {
    try {

        const { id } = req.params;

        const { referral_code } = req.body;

        const currentUser = req.userData;
        const UserID = currentUser.id;
        let result = false;
        const currentDateTime = new Date();

        const pool = await getPoolByIDV2(id);

        if (!pool) {
            logger.error(`Pool with ID ${id} not found`);
            return responseHandler.sendSuccessResponse(res, {}, "Pool not found");
        }
        const isMember = await checkIfUserIsMemberOfPool(UserID, id);
        if (isMember) {

            logger.warn(`User ${UserID} is already a member of pool ${id}`);
            return responseHandler.sendSuccessResponse(res, {}, "You are already a member of this pool");
        }
        const existingRequest = await getPoolJoiningRequestExisting(id, UserID);
        if (existingRequest) {
            logger.warn(`User ${UserID} already has a pending join request for pool ${id}`);
            return responseHandler.sendSuccessResponse(res, {}, "You already have a pending join request for this pool");
        }

        const referralUser = await getUserByReferral(referral_code);
        if (!referralUser) {
            logger.warn(`Invalid referral code provided by user ${UserID} for pool ${id}`);
            return responseHandler.sendSuccessResponse(res, {}, "Invalid referral code");
        }


        result = await addPoolJoiningRequests(id, UserID, referral_code, currentDateTime);

        if (result) {
            logger.info(`Join request created successfully for user ${UserID} to pool ${id}`);
            return responseHandler.sendSuccessResponse(res, {
                Request: result,
            }, "Join request send to pool admin for approval.");
        }
        else {
            logger.error(`Failed to create join request for user ${UserID} to pool ${id}`);
            return responseHandler.sendSuccessResponse(res, {}, "Failed to create join request");
        }

    }
    catch (err) {
        logger.error(`RequestToJoinPool error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetPendingJoinRequests = async (req, res, next) => {
    try {

        const { id } = req.params;
        const currentUser = req.userData;
        const UserID = currentUser.id;
        let pool = await getPoolByIDV2(id);
        if (!pool) {
            logger.error(`Pool with ID ${id} not found`);
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }
        if (!authorization(currentUser, Operations.Read, pool)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const requests = await getPoolJoinRequests(id);

        logger.info(`Pending join requests retrieved successfully for pool ${id}`);
        return responseHandler.sendSuccessResponse(res, {
            Requests: requests,
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`GetPendingJoinRequests error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetJoinPoolDetails = async (req, res, next) => {
    try {

        const { id } = req.params;
        const currentUser = req.userData;
        const UserID = currentUser.id;

        const pool = await getJoinPoolDetails(id);

        return responseHandler.sendSuccessResponse(res, {
            Pool: pool,
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`GetJoinPoolDetails error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.UpdatePoolJoiningRequest = async (req, res, next) => {
    try {
        const { id, memberID, requestId } = req.params;
        let { action } = req.body; // expected 'approve' or 'reject'
        const currentUser = req.userData;

        // Validate & normalize inputs
        if (!action || typeof action !== 'string') {
            logger.error(`No action provided for join request ${requestId}`);
            return responseHandler.sendBadRequestResponse(res, "Invalid action. Must be 'approve' or 'reject'");
        }
        action = action.toLowerCase();
        if (action !== 'approve' && action !== 'reject') {
            logger.error(`Invalid action ${action} provided for join request ${requestId}`);
            return responseHandler.sendBadRequestResponse(res, "Invalid action. Must be 'approve' or 'reject'");
        }

        const parsedMemberID = parseInt(memberID, 10);
        if (Number.isNaN(parsedMemberID)) {
            logger.error(`Invalid memberID ${memberID} for join request ${requestId}`);
            return responseHandler.sendBadRequestResponse(res, "Invalid member ID");
        }

        // Load pool and check authorization
        const pool = await getPoolByIDV2(id);
        if (!pool) {
            logger.error(`Pool with ID ${id} not found`);
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }
        if (!authorization(currentUser, Operations.Update, pool)) {
            logger.warn(`Unauthorized user ${currentUser?.id} attempted to update join request ${requestId}`);
            return responseHandler.sendUnauthorizedResponse(res, "Unauthorized");
        }

        // Load join request
        const joinRequest = await getPoolJoiningRequestById(requestId);
        if (!joinRequest) {
            logger.error(`Join request with ID ${requestId} not found`);
            return responseHandler.sendNotFoundResponse(res, "Join request not found");
        }

        if (joinRequest.poolID !== pool.id || joinRequest.userId !== parsedMemberID) {
            logger.error(`Join request ${requestId} does not match pool ${id} and member ${memberID}`);
            return responseHandler.sendBadRequestResponse(res, "Join request does not match pool and member");
        }

        if (joinRequest.status !== 0) {
            logger.warn(`Join request ${requestId} is already ${joinRequest.status}`);
            return responseHandler.sendBadRequestResponse(res, `Join request is already processed`);
        }

        // Update join request status first
        const newStatus = action === 'approve' ? 1 : 2;
        const updated = await updatePoolJoiningRequest(requestId, newStatus);
        if (!updated) {
            logger.error(`Failed to update join request ${requestId} status to ${newStatus}`);
            return responseHandler.sendInternalServerErrorResponse(res, "Failed to update join request status");
        }

        // If approved, add the user to the pool
        if (action === 'approve') {
            try {
                await addMemberToPool(joinRequest.poolID, joinRequest.userId);
            } catch (addErr) {
                logger.error(`addMemberToPool failed for user ${joinRequest.userId} pool ${joinRequest.poolID}: ${addErr.message}`, { stack: addErr.stack });

                // Attempt rollback of join request status to pending (0)
                try {
                    await updatePoolJoiningRequest(requestId, 0);
                    logger.info(`Rolled back join request ${requestId} to pending after addMemberToPool failure`);
                } catch (rollbackErr) {
                    logger.error(`Failed to rollback join request ${requestId}: ${rollbackErr.message}`, { stack: rollbackErr.stack });
                }

                return responseHandler.sendInternalServerErrorResponse(res, "Failed to add member to pool");
            }
        }

        // Fetch member for email
        const member = await findUserByIdV2(parsedMemberID);
        if (!member) {
            logger.error(`User with ID ${parsedMemberID} not found`);
            return responseHandler.sendNotFoundResponse(res, "User not found");
        }

        // Send the general join status email to the member
        try {
            const template = await fsReadFileHtml('/email_templates/joinPoolTemplate.ejs');
            const mailBody = ejs.render(template, {
                user: member,
                pool: pool,
                action: action,
                createdAt: new Date().toLocaleDateString()
            });

            const emailConfiguration = {
                from: `collectly <${process.env.EMAIL1_USERNAME}>`,
                to: member.email,
                subject: action === 'approve' ? 'Pool Join Request Approved' : 'Pool Join Request Rejected',
                html: mailBody
            };

            await SendMail(emailConfiguration);
        } catch (mailErr) {
            logger.error(`Error sending join status email to user ${parsedMemberID}: ${mailErr.message}`, { stack: mailErr.stack });
            // Don't fail the overall request for email issues
        }

        logger.info(`Join request ${requestId} for user ${parsedMemberID} to pool ${id} has been ${action}d`);

        return responseHandler.sendSuccessResponse(res, {
            Success: true
        }, `Join request has been ${action}d`);
    } catch (err) {
        logger.error(`UpdatePoolJoiningRequest error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.UploadPoolImage = async (req, res, next) => {
    const { file } = req.files;
    const { id } = req.params;

    try {

        if (!file || Object.keys(file).length === 0) {
            return responseHandler.sendBadRequestResponse(res, "No files were uploaded.");
        }

        const result = await uploadPoolImage(id, file);

        responseHandler.sendSuccessResponse(res, {
            File: result,
        }, "Success!!!");
    }
    catch (err) {
        logger.error(`UploadPoolImage error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.UpdatePool = async (req, res, next) => {
    try {
        const { id } = req.params;
        const poolData = req.body;
        const currentUser = req.userData;
        const UserID = currentUser.id;

        let pool = await getPoolByIDV2(id);

        if (!pool) {
            logger.error(`Pool with ID ${id} not found`);
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }

        if (!authorization(currentUser, Operations.Update, pool)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const result = await updatePool(id, poolData);
        if (!result) {
            logger.error(`Failed to update pool with ID ${id}`);
            return responseHandler.sendErrorResponse(res, "Failed to update pool", 400);
        }

        logger.info(`Pool with ID ${id} updated successfully`);

        const updatedPool = await getPoolByID(id);

        // Send success response first before notifications
        responseHandler.sendSuccessResponse(res, {
            Pool: updatedPool,
        }, "Pool updated successfully");

        // Notification logic - fire and forget (don't block response)
        const notificationReceiver = await findUserByIdV2(updatedPool.poolOwner.id);
        if (!notificationReceiver) {
            logger.error(`Owner with ID ${updatedPool.poolOwner.id} not found for pool ${id}`);
            return;
        }

        // Send notifications in parallel for better performance
        await Promise.allSettled([
            // App notification
            (async () => {
                try {
                    await SendAppNotification(notificationReceiver.id, 'Updated pool ' + updatedPool.name + ' settings ');
                } catch (appErr) {
                    logger.error('Error sending app notification:', appErr);
                }
            })(),

            // Email notification
            (async () => {
                try {
                    const template = await fsReadFileHtml('email_templates/poolUpdateTemplate.ejs');
                    let mailBody = ejs.render(template, { pool: updatedPool, user: notificationReceiver });
                    await SendEmailNotification(true, notificationReceiver.id, notificationReceiver.email, "Pool updated", mailBody);
                } catch (emailErr) {
                    logger.error('Error sending email notification:', emailErr);
                }
            })(),

            // SMS notification
            (async () => {
                try {
                    let smsBody = smsTemplate.POOL_UPDATED
                        .replace('{0}', `${notificationReceiver.firstName} ${notificationReceiver.lastName}`)
                        .replace('{1}', `${updatedPool.name}`);
                    await SendSMSNotification(true, notificationReceiver.id, notificationReceiver.phone, smsBody);
                } catch (smsErr) {
                    logger.error('Error sending SMS notification:', smsErr);
                }
            })()
        ]);

    } catch (err) {
        logger.error(`UpdatePool error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.PoolDeleteRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUser = req.userData;
        const UserID = currentUser.id;

        let pool = await getPoolByIDV2(id);
        if (!pool) {
            logger.error(`Pool with ID ${id} not found`);
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }

        if (!authorization(currentUser, Operations.Delete, pool)) {
            return responseHandler.sendUnauthorizedResponse(res, "");
        }

        const result = await poolDeleteRequest(id, UserID);
        if (!result) {
            logger.error(`Failed to create delete request for pool with ID ${id}`);

            return responseHandler.sendSuccessResponse(res, {}, "Failed to create delete request");
        }

        logger.info(`Delete request created successfully for pool with ID ${id}`);

        return responseHandler.sendSuccessResponse(res, {
            Request: result,
        }, "Delete request created successfully");
    }
    catch (err) {
        logger.error(`PoolDeleteRequest error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.CreatePool = async (req, res, next) => {
    try {
        const poolData = req.body;
        const currentUser = req.userData;
        const UserID = currentUser.id;

        const result = await createPool(poolData, UserID);
        if (!result) {
            logger.error(`Failed to create pool for user ${UserID}`);
            return responseHandler.sendErrorResponse(res, "Failed to create pool", 400);
        }

        logger.info(`Pool created successfully with ID ${result.id} for user ${UserID}`);

        // Send success response first before notifications
        responseHandler.sendSuccessResponse(res, {
            Pool: result,
        }, "Pool created successfully");

        // Notification logic - fire and forget (don't block response)
        const notificationReceiver = await findUserByIdV2(UserID);
        if (!notificationReceiver) {
            logger.error(`Owner with ID ${UserID} not found for pool ${result.id}`);
            return;
        }

        // Send notifications in parallel for better performance
        await Promise.allSettled([
            // App notification
            (async () => {
                try {
                    await SendAppNotification(notificationReceiver.id, 'create pool ' + result.name + ' settings ');
                } catch (appErr) {
                    logger.error('Error sending app notification:', appErr);
                }
            })(),

            // Email notification
            (async () => {
                try {
                    const template = await fsReadFileHtml('/email_templates/poolCreateTemplate.ejs');
                    let mailBody = ejs.render(template, { pool: result, user: notificationReceiver });
                    await SendEmailNotification(true, notificationReceiver.id, notificationReceiver.email, "Pool created", mailBody);
                } catch (emailErr) {
                    logger.error('Error sending email notification:', emailErr);
                }
            })(),

            // SMS notification
            (async () => {
                try {
                    let smsBody = smsTemplate.POOL_CREATED
                        .replace('{0}', `${notificationReceiver.firstName} ${notificationReceiver.lastName}`)
                        .replace('{1}', `${result.name}`);
                    await SendSMSNotification(true, notificationReceiver.id, notificationReceiver.phone, smsBody);
                } catch (smsErr) {
                    logger.error('Error sending SMS notification:', smsErr);
                }
            })()
        ]);

    } catch (err) {
        logger.error(`CreatePool error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.SubmitReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { categories, primaryReason, additionalDetails } = req.body;
        const currentUser = req.userData;
        const reporterId = currentUser.id;

        if (!id || !categories || !Array.isArray(categories) || categories.length === 0) {
            return responseHandler.sendBadRequestResponse(res, "Pool ID and at least one category are required");
        }

        const validCategories = ['spam', 'scam', 'harassment', 'inappropriate', 'privacy', 'illegal', 'other'];
        const invalidCategories = categories.filter(cat => !validCategories.includes(cat));

        if (invalidCategories.length > 0) {
            return responseHandler.sendBadRequestResponse(res, `Invalid categories: ${invalidCategories.join(', ')}`);
        }

        const report = await submitReport({
            poolId: id,
            reporterId: reporterId,
            categories,
            primaryReason: primaryReason || null,
            additionalDetails: additionalDetails || null
        });

        logger.info(`Report submitted successfully`, {
            reportId: report.id,
            id,
            reporterId,
            categories
        });

        return responseHandler.sendSuccessResponse(res, {
            reportId: report.id,
            submittedAt: report.createdAt,
            severity: report.severity
        }, "Report submitted successfully. Our team will review it shortly.");

    } catch (err) {
        logger.error(`Report submission error: ${err.message}`, {
            stack: err.stack,
            poolId: req.params.id,
            reporterId: req.userId
        });

        if (err.message.includes('not found')) {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }
        if (err.message.includes('already submitted')) {
            return responseHandler.sendConflictResponse(res, err.message);
        }

        return responseHandler.sendInternalServerErrorResponse(res, "An error occurred while submitting the report");
    }
}

exports.getPoolMemberDetails = async (req, res, next) => {
    try {
        const { id: poolId, memberID } = req.params;
        const currentUser = req.userData;

        // Validate inputs
        if (!poolId || !memberID) {
            return responseHandler.sendBadRequestResponse(res, "Pool ID and Member ID are required");
        }

        // Check if current user has access to this pool
        const isMember = await checkIfUserIsMemberOfPool(currentUser.id, poolId);
        if (!isMember) {
            logger.warn(`User ${currentUser.id} is not a member of pool ${poolId}`);
            return responseHandler.sendUnauthorizedResponse(res, "You are not a member of this pool");
        }

        // FIX: Pass current user ID to service for proper canManage check
        const result = await poolMemberService.getPoolMemberDetails(poolId, memberID, currentUser.id);

        logger.info(`Member details retrieved successfully for member ${memberID} in pool ${poolId}`, {
            username: result.member.username,
            role: result.member.role,
            totalContributed: result.member.totalContributed,
            canManage: result.member.canManage
        });

        return responseHandler.sendSuccessResponse(res, {
            Member: result.member,
        }, 'Member details retrieved successfully');
    } catch (err) {
        logger.error(`getPoolMemberDetails controller error: ${err.message}`, { stack: err.stack });
        if (err.code === 'POOL_NOT_FOUND' || err.code === 'USER_NOT_FOUND' || err.code === 'MEMBERSHIP_NOT_FOUND') {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }
        if (err.code === 'INVALID_IDS') {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.updateMemberRole = async (req, res, next) => {
    try {
        const { id: poolId, memberID } = req.params;
        const { role } = req.body; // Changed from newRole to role to match frontend
        const currentUser = req.userData;

        if (!currentUser || !currentUser.id) {
            logger.warn('updateMemberRole attempted without authenticated user');
            return responseHandler.sendUnauthorizedResponse(res, 'Unauthorized');
        }

        if (!role) {
            return responseHandler.sendBadRequestResponse(res, "Role is required");
        }

        // Validate role
        const validRoles = ['member', 'admin', 'moderator'];
        if (!validRoles.includes(role)) {
            return responseHandler.sendBadRequestResponse(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }

        // Check authorization - user must be admin of the pool
        const pool = await getPoolByIDV2(poolId);
        if (!pool) {
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }

        if (!authorization(currentUser, Operations.Update, pool)) {
            logger.warn(`User ${currentUser.id} is not authorized to update roles in pool ${poolId}`);
            return responseHandler.sendUnauthorizedResponse(res, "You are not authorized to update member roles");
        }

        const updatedMembership = await poolMemberService.updateMemberRole(poolId, memberID, role, currentUser.id);

        logger.info(`Member role updated successfully for member ${memberID} in pool ${poolId} to ${role}`);

        return responseHandler.sendSuccessResponse(res, {
            Member: sanitizeMemberDetails(updatedMembership),
        }, 'Member role updated successfully');
    } catch (err) {
        logger.error(`updateMemberRole controller error: ${err.message}`, { stack: err.stack });
        if (err.code === 'POOL_NOT_FOUND' || err.code === 'MEMBERSHIP_NOT_FOUND') {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }
        if (err.code === 'UNAUTHORIZED') {
            return responseHandler.sendUnauthorizedResponse(res, err.message);
        }
        if (err.code === 'CANNOT_CHANGE_OWNER' || err.code === 'INVALID_ROLE_CHANGE' || err.code === 'INVALID_ROLE') {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        if (err.code === 'INVALID_IDS') {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.removeMemberFromPool = async (req, res, next) => {
    try {
        const { id: poolId, memberID } = req.params;
        const currentUser = req.userData;

        if (!currentUser || !currentUser.id) {
            logger.warn('removeMemberFromPool attempted without authenticated user');
            return responseHandler.sendUnauthorizedResponse(res, 'Unauthorized');
        }

        // Check authorization - user must be admin of the pool
        const pool = await getPoolByIDV2(poolId);
        if (!pool) {
            return responseHandler.sendNotFoundResponse(res, "Pool not found");
        }

        if (!authorization(currentUser, Operations.Update, pool)) {
            logger.warn(`User ${currentUser.id} is not authorized to remove members from pool ${poolId}`);
            return responseHandler.sendUnauthorizedResponse(res, "You are not authorized to remove members from this pool");
        }

        const result = await poolMemberService.removeMemberFromPool(poolId, memberID, currentUser.id);

        logger.info(`Member ${memberID} removed successfully from pool ${poolId} by user ${currentUser.id}`);

        return responseHandler.sendSuccessResponse(res, {
            Success: true,
            message: 'Member removed from pool successfully'
        }, 'Member removed from pool successfully');
    } catch (err) {
        logger.error(`removeMemberFromPool controller error: ${err.message}`, { stack: err.stack });
        if (err.code === 'POOL_NOT_FOUND' || err.code === 'MEMBERSHIP_NOT_FOUND') {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }
        if (err.code === 'UNAUTHORIZED') {
            return responseHandler.sendUnauthorizedResponse(res, err.message);
        }
        if (err.code === 'CANNOT_REMOVE_OWNER') {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        if (err.code === 'INVALID_IDS') {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.getMemberContributions = async (req, res, next) => {
    try {
        const { id: poolId, memberID } = req.params;
        const currentUser = req.userData;

        // Validate inputs
        if (!poolId || !memberID) {
            return responseHandler.sendBadRequestResponse(res, "Pool ID and Member ID are required");
        }

        // Check if current user has access to this pool
        const isMember = await checkIfUserIsMemberOfPool(currentUser.id, poolId);
        if (!isMember) {
            logger.warn(`User ${currentUser.id} is not a member of pool ${poolId}`);
            return responseHandler.sendUnauthorizedResponse(res, "You are not a member of this pool");
        }

        const { limit, offset, fromDate, toDate, aggregate } = req.query;

        const options = {
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            aggregate: aggregate === 'true'
        };

        // Validate limit and offset
        if (options.limit < 1 || options.limit > 100) {
            return responseHandler.sendBadRequestResponse(res, "Limit must be between 1 and 100");
        }
        if (options.offset < 0) {
            return responseHandler.sendBadRequestResponse(res, "Offset must be a positive number");
        }

        const data = await poolMemberService.getMemberContributions(poolId, memberID, options);

        logger.info(`Contributions retrieved successfully for member ${memberID} in pool ${poolId}`, {
            contributionsCount: data.contributions.length,
            totalAmount: data.summary.totalAmount
        });

        return responseHandler.sendSuccessResponse(res, {
            Contributions: data.contributions,
            Summary: data.summary,
            Pagination: data.pagination
        }, 'Member contributions retrieved successfully');
    } catch (err) {
        logger.error(`getMemberContributions controller error: ${err.message}`, { stack: err.stack });
        if (err.code === 'INVALID_IDS') {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        if (err.code === 'POOL_NOT_FOUND' || err.code === 'MEMBERSHIP_NOT_FOUND') {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }
        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.getMemberActivity = async (req, res, next) => {
    try {
        const { id: poolId, memberID } = req.params;
        const currentUser = req.userData;

        // Validate inputs
        if (!poolId || !memberID) {
            return responseHandler.sendBadRequestResponse(res, "Pool ID and Member ID are required");
        }

        // Check if current user has access to this pool
        const isMember = await checkIfUserIsMemberOfPool(currentUser.id, poolId);
        if (!isMember) {
            logger.warn(`User ${currentUser.id} is not a member of pool ${poolId}`);
            return responseHandler.sendUnauthorizedResponse(res, "You are not a member of this pool");
        }

        const { limit, offset, types } = req.query;

        const options = {
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
            types: types ? (Array.isArray(types) ? types : types.split(',').map(t => t.trim()).filter(Boolean)) : undefined
        };

        // Validate limit and offset
        if (options.limit < 1 || options.limit > 100) {
            return responseHandler.sendBadRequestResponse(res, "Limit must be between 1 and 100");
        }
        if (options.offset < 0) {
            return responseHandler.sendBadRequestResponse(res, "Offset must be a positive number");
        }

        const data = await poolMemberService.getMemberActivity(poolId, memberID, options);

        logger.info(`Activity retrieved successfully for member ${memberID} in pool ${poolId}`, {
            activityCount: data.activities.length,
            totalActivities: data.pagination.total
        });

        return responseHandler.sendSuccessResponse(res, {
            Activity: data.activities,
            Pagination: data.pagination
        }, 'Member activity retrieved successfully');
    } catch (err) {
        logger.error(`getMemberActivity controller error: ${err.message}`, { stack: err.stack });
        if (err.code === 'INVALID_IDS') {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }
        if (err.code === 'POOL_NOT_FOUND' || err.code === 'MEMBERSHIP_NOT_FOUND') {
            return responseHandler.sendNotFoundResponse(res, err.message);
        }
        return responseHandler.sendInternalServerErrorResponse(res);
    }
};



