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
    generateJWTToken,
    generateJWTRefreshToken,
    generateJWTTokenMobile,
    verifyRefreshToken,
} = require('../utils/jwt.js');
const {
    isEmpty
} = require('../utils/helper.js');
const {
    hashPassword,
    compareAsync,
    findLoginUserByUsername,
    createUser,
    createForgotPassword,
    updateForgotPasswordRequestComplete,
    verifyForgotPasswordRequest,
    changePassword,
    changeAccountPassword,
    findUserById,
    findUserByIdV2,
    createUserEmailVerification,
    checkIfEmailIsVerified,
    markEmailVerified,
    getUserPassword,
    userDeleteRequest,
    haveAccountMarkedForDeletion
} = require('../services/auth.service.js');
const {
    createAuthToken,
    getAuthTokenByToken,
    getAuthTokenByUserId,
    deleteAuthTokenByToken
} = require('../services/authToken.service.js');
const {
    GetNotifications,
    MarkNotificationsAsRead,
    GetNotificationById,
    DeleteNotification
} = require('../services/notification.service.js');
const logger = require("../utils/logger");
const {
    generateDataExport
} = require('../services/dataExport.service.js');
const {
    addUserReferrals,
    getUserByReferral
} = require('../services/user.service.js');

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require("path");


exports.WebLogin = async (req, res, next) => {
    try {
        // Input validation
        const { username, password } = req.body;
        if (!username || !password) {
            return responseHandler.sendBadRequestResponse(res, "Username and password are required");
        }

        // Rate limiting check would go here

        const record = await findLoginUserByUsername(username, ("https://" + req.host));

        if (!record) {
            logger.warn(`Failed login attempt for username: ${username}`);
            return responseHandler.sendUnauthorizedResponse(res, "Invalid credentials");
        }

        // Check if account is marked for deletion
        const deletionRequest = await haveAccountMarkedForDeletion(record.id);
        if (deletionRequest.length > 0) {
            return responseHandler.sendForbiddenResponse(res, "Account is pending deletion");
        }

        // Verify password
        let userPassword = await getUserPassword(record.id);
        let validatePassword = await compareAsync(password, userPassword.password);

        if (!validatePassword) {
            logger.warn(`Failed login attempt for user ID: ${record.id}`);
            return responseHandler.sendUnauthorizedResponse(res, "Invalid credentials");
        }

        // Check email verification status if required
        if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
            const isVerified = await checkIfEmailIsVerified(record.id);
            if (!isVerified) {
                return responseHandler.sendForbiddenResponse(res, "Email not verified");
            }
        }

        const authResult = await AuthTokenGeneration(record);
        logger.info(`User ${record.id} logged in successfully`);

        return responseHandler.sendSuccessResponse(res, authResult, "Logged in successfully");

    } catch (err) {
        logger.error(`Login error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res, "An error occurred during login");
    }
}

exports.MobileLogin = async (req, res, next) => {
    try {
        // Input validation
        const { username, password } = req.body;
        if (!username || !password) {
            return responseHandler.sendBadRequestResponse(res, "Username and password are required");
        }

        // Rate limiting check would go here

        const record = await findLoginUserByUsername(username, ("https://" + req.host));

        if (!record) {
            logger.warn(`Failed login attempt for username: ${username}`);
            return responseHandler.sendUnauthorizedResponse(res, "Invalid credentials");
        }

        // Check if account is marked for deletion
        const deletionRequest = await haveAccountMarkedForDeletion(record.id);
        if (deletionRequest.length > 0) {
            return responseHandler.sendForbiddenResponse(res, "Account is pending deletion");
        }

        // Verify password
        let userPassword = await getUserPassword(record.id);
        let validatePassword = await compareAsync(password, userPassword.password);

        if (!validatePassword) {
            logger.warn(`Failed login attempt for user ID: ${record.id}`);
            return responseHandler.sendUnauthorizedResponse(res, "Invalid credentials");
        }

        // Check email verification status if required
        if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
            const isVerified = await checkIfEmailIsVerified(record.id);
            if (!isVerified) {
                return responseHandler.sendForbiddenResponse(res, "Email not verified");
            }
        }

        const authResult = await AuthTokenGeneration(record);
        logger.info(`User ${record.id} logged in successfully`);

        return responseHandler.sendSuccessResponse(res, authResult, "Logged in successfully");

    } catch (err) {
        logger.error(`Login error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res, "An error occurred during login");
    }
}

exports.WebRegister = async (req, res, next) => {
    try {
        const { username, password, firstName, lastName, email, date_of_birth, phone, referral } = req.body;

        const record = await createUser({
            username: username,
            password: password,
            firstName: firstName,
            lastName: lastName,
            email: email,
            status: 1,
            date_of_birth: date_of_birth,
            phone: phone,
            referral: referral
        });

        if (!record) {
            return responseHandler.sendInternalServerErrorResponse(res, "We encountered an issue creating your account. Please try again.");
        }

        // Send registration email
        try {
            const template = await fsReadFileHtml('/email_templates/registerTemplate.ejs');
            let mailBody = ejs.render(template, { user: record });

            let emailConfiguration = {
                from: `collectly <${process.env.EMAIL1_USERNAME}>`,
                to: record.email,
                subject: 'collectly Registration Successful',
                html: mailBody
            };

            await SendMail(emailConfiguration);
        }
        catch (emailErr) {
            logger.error(`Error sending registration email to ${record.email}: ${emailErr.message}`, { stack: emailErr.stack });
        }

        // Notify referrer if applicable
        if (referral) {
            try {
                // Process referral
                await addUserReferrals(record.id, referral);

                // Find the referrer user (the one who owns the referral code)
                const referrer = await getUserByReferral(referral);

                if (referrer) {
                    const referralCredit = parseFloat(process.env.REFERRAL_CREDIT) || 0;

                    // 1. Send email to referrer
                    const referrerTemplate = await fsReadFileHtml('/email_templates/referralRecorded.ejs');
                    const referrerMailBody = ejs.render(referrerTemplate, {
                        referrer: referrer,
                        referredUser: record,
                        referralCredit: referralCredit,
                        frontendUrl: process.env.FRONTEND_URL
                    });

                    const referrerEmailConfiguration = {
                        from: `collectly <${process.env.EMAIL1_USERNAME}>`,
                        to: referrer.email,
                        subject: 'You Earned Referral Credits!',
                        html: referrerMailBody
                    };

                    await SendMail(referrerEmailConfiguration);

                    // 2. Send email to new user about their welcome credit
                    const welcomeCreditTemplate = await fsReadFileHtml('/email_templates/referralWelcomeCredit.ejs');
                    const welcomeCreditMailBody = ejs.render(welcomeCreditTemplate, {
                        referredUser: record,
                        referrer: referrer,
                        referralCredit: referralCredit,
                        frontendUrl: process.env.FRONTEND_URL
                    });

                    const welcomeCreditEmailConfiguration = {
                        from: `collectly <${process.env.EMAIL1_USERNAME}>`,
                        to: record.email,
                        subject: 'Welcome Credit Added to Your Account!',
                        html: welcomeCreditMailBody
                    };

                    await SendMail(welcomeCreditEmailConfiguration);
                }
            } catch (referralErr) {
                logger.error(`Error processing referral: ${referralErr.message}`, { stack: referralErr.stack });
                // Don't throw error - continue with registration even if referral fails
            }
        }

        return responseHandler.sendSuccessResponse(res, "Registration successful! Please check your email for confirmation.");

    } catch (err) {
        if (err.message === "USERNAME_ALREADY_EXISTS") {
            return responseHandler.sendBadRequestResponse(res, "The username you provided is already in use. Please use a different username.");
        } else if (err.message === "EMAIL_ALREADY_EXISTS") {
            return responseHandler.sendBadRequestResponse(res, "The email you provided is already in use. Please use a different email.");
        } else if (err.name === "SequelizeUniqueConstraintError") {
            // Extract field name from error message
            let field = "information";
            if (err.original && err.original.sqlMessage) {
                if (err.original.sqlMessage.includes("username")) field = "username";
                else if (err.original.sqlMessage.includes("email")) field = "email";
                else if (err.original.sqlMessage.includes("phone")) field = "phone number";
            }

            return responseHandler.sendBadRequestResponse(res, `The ${field} you provided is already in use. Please use a different ${field}.`);
        } else if (err.name === "SequelizeValidationError") {
            return responseHandler.sendBadRequestResponse(res, "Please provide valid information in all required fields.");
        } else if (err.name === "SequelizeDatabaseError") {
            return responseHandler.sendInternalServerErrorResponse(res, "We're experiencing technical difficulties. Please try again later.");
        } else if (err.message === 'Referral code not found' ||
            err.message === 'Cannot use your own referral code' ||
            err.message === 'Referral already exists') {
            // Handle referral-specific errors gracefully
            logger.warn(`Referral error during registration: ${err.message}`);
            // Continue with registration but skip referral processing
            return responseHandler.sendSuccessResponse(res, "Registration successful! Please check your email for confirmation.");
        }

        logger.error(`WebRegister error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res, "Our system is currently experiencing issues. Please try again later.");
    }
}

exports.WebRefreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        const { err, decoded } = await verifyRefreshToken(refreshToken);

        if (err) {
            return responseHandler.sendUnauthorizedResponse(res, "Invalid Refresh Token");
        }

        const { id, username, email } = decoded;

        const user = await findUserByIdV2(id);

        if (isEmpty(user)) {
            return responseHandler.sendUnauthorizedResponse(res, "Invalid User");
        }

        var authResult = await AuthTokenGeneration(user);

        return responseHandler.sendSuccessResponse(res, authResult, "Token Refreshed Successfully!!!");

    } catch (err) {
        logger.error("WebRefreshToken: " + err.message);
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.CreateForgotPassword = async (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.id || generateRequestId();

    try {
        logger.info(`[${requestId}] Forgot password request initiated`, {
            email: req.body.email ? maskEmail(req.body.email) : 'undefined',
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        const { email, callbackUrl } = req.body;

        if (!email) {
            logger.warn(`[${requestId}] Missing email in request`);
            return responseHandler.sendBadRequestResponse(res, "Email is required");
        }

        // Validate and sanitize callbackUrl
        let validatedCallbackUrl = null;
        if (callbackUrl) {
            try {
                validatedCallbackUrl = validateAndSanitizeCallbackUrl(callbackUrl);
                if (!validatedCallbackUrl) {
                    logger.warn(`[${requestId}] Invalid or unauthorized callback URL`, {
                        callbackUrl: callbackUrl
                    });
                    return responseHandler.sendBadRequestResponse(res, "Invalid callback URL");
                }
            } catch (urlErr) {
                logger.warn(`[${requestId}] Callback URL validation failed: ${urlErr.message}`);
                return responseHandler.sendBadRequestResponse(res, "Invalid callback URL format");
            }
        }

        // Create forgot password record
        let record = await createForgotPassword(email);

        if (!record || !record.User) {
            logger.info(`[${requestId}] No user found for email`, { email: maskEmail(email) });
            return responseHandler.sendSuccessResponse(res, {
                message: "If the email exists, a password reset link has been sent"
            }, "Success");
        }

        const template = await fsReadFileHtml('/email_templates/forgotPasswordTemplate.ejs');
        if (!template) {
            logger.error(`[${requestId}] Email template not found`);
            throw new Error('Email template not available');
        }

        const resetToken = record.resetPasswordToken;

        // Use validated callback URL or default
        const resetLink = validatedCallbackUrl
            ? `${validatedCallbackUrl}?token=${resetToken}`
            : `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        const expirationTime = process.env.EMAIL_TOKEN_EXPIRY || '1 hour';

        try {
            const mailBody = ejs.render(template, {
                user: record.User,
                link: resetLink,
                expirationTime: expirationTime,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@collectly.com'
            });

            const emailConfiguration = {
                from: `collectly <${process.env.EMAIL1_USERNAME}>`,
                to: record.User.email,
                subject: 'Password Reset Request - collectly',
                html: mailBody,
                headers: {
                    'X-Request-ID': requestId,
                    'X-Priority': '1',
                    'Importance': 'high'
                }
            };

            await SendMail(emailConfiguration);
        }
        catch (emailErr) {
            logger.error(`[${requestId}] Failed to send password reset email: ${emailErr.message}`, {
                stack: emailErr.stack,
                email: maskEmail(record.User.email),
                userId: record.User.id
            });
            return responseHandler.sendServiceUnavailableResponse(res,
                "Unable to send password reset email at this time. Please try again later."
            );
        }

        logger.info(`[${requestId}] Password reset email sent successfully`, {
            email: maskEmail(record.User.email),
            userId: record.User.id,
            duration: Date.now() - startTime,
            usedCustomCallback: !!validatedCallbackUrl
        });

        return responseHandler.sendSuccessResponse(res, {
            message: "If the email exists, a password reset link has been sent",
            expiresIn: expirationTime
        }, "Password reset instructions sent successfully");

    } catch (err) {
        logger.error(`[${requestId}] CreateForgotPassword error: ${err.message}`, {
            stack: err.stack,
            duration: Date.now() - startTime,
            email: req.body.email ? maskEmail(req.body.email) : 'undefined'
        });

        if (err.name === 'ValidationError') {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }

        if (err.code === 'EMAIL_SERVICE_UNAVAILABLE') {
            return responseHandler.sendServiceUnavailableResponse(res,
                "Email service is temporarily unavailable. Please try again later."
            );
        }

        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.ResetPassword = async (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.id || generateRequestId();

    try {
        logger.info(`[${requestId}] Password change request initiated`, {
            hasToken: !!req.body.token,
            hasPassword: !!req.body.password
        });

        // Input validation
        const { token, password } = req.body;

        if (!token) {
            logger.warn(`[${requestId}] Missing reset token`);
            return responseHandler.sendBadRequestResponse(res, "Reset token is required");
        }

        if (!password) {
            logger.warn(`[${requestId}] Missing new password`);
            return responseHandler.sendBadRequestResponse(res, "New password is required");
        }

        if (typeof token !== 'string' || token.trim().length === 0) {
            logger.warn(`[${requestId}] Invalid token format`);
            return responseHandler.sendBadRequestResponse(res, "Invalid token format");
        }

        const trimmedToken = token.trim();

        var verifyForgotPasswordRequestResult = await verifyForgotPasswordRequest(trimmedToken);

        if (!verifyForgotPasswordRequestResult) {
            logger.warn(`[${requestId}] Invalid or expired reset token`, {
                token: maskToken(trimmedToken)
            });
            return responseHandler.sendUnauthorizedResponse(res,
                "Invalid or expired reset token. Please request a new password reset."
            );
        }

        if (verifyForgotPasswordRequestResult.isRequestCompleted) {
            logger.warn(`[${requestId}] Reset token already used`, {
                token: maskToken(trimmedToken)
            });
            return responseHandler.sendUnauthorizedResponse(res,
                "This reset token has already been used. Please request a new password reset."
            );
        }

        // Change password
        let record = await changePassword(trimmedToken, password);

        if (record) {

            await updateForgotPasswordRequestComplete(trimmedToken);

            logger.info(`[${requestId}] Password changed successfully`, {
                userId: record.id,
                email: maskEmail(record.email)
            });

            // Send confirmation email
            try {
                const template = await fsReadFileHtml('/email_templates/changedPasswordTemplate.ejs');

                if (!template) {
                    logger.warn(`[${requestId}] Password change email template not found`);
                    // Continue without email - password change was still successful
                } else {
                    const mailBody = ejs.render(template, {
                        user: record,
                        changedAt: new Date().toISOString(),
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        supportEmail: process.env.SUPPORT_EMAIL || 'support@collectly.com'
                    });

                    const emailConfiguration = {
                        from: `collectly <${process.env.EMAIL1_USERNAME}>`,
                        to: record.email,
                        subject: "Password Changed Successfully - collectly",
                        html: mailBody,
                        headers: {
                            'X-Request-ID': requestId,
                            'Priority': '1'
                        }
                    };

                    await SendMail(emailConfiguration);
                    logger.info(`[${requestId}] Password change notification email sent`, {
                        email: maskEmail(record.email)
                    });
                }
            } catch (emailError) {
                // Log email error but don't fail the password change
                logger.error(`[${requestId}] Failed to send password change email: ${emailError.message}`, {
                    email: maskEmail(record.email)
                });
            }

            // Return success response (don't include sensitive data)
            return responseHandler.sendSuccessResponse(res, {
                message: "Password changed successfully",
                user: {
                    id: record.id,
                    email: record.email
                    // Don't include password or other sensitive fields
                }
            }, "Password changed successfully");

        } else {
            logger.warn(`[${requestId}] Invalid token or user not found for password change`, {
                token: maskToken(trimmedToken)
            });

            return responseHandler.sendUnauthorizedResponse(res,
                "Invalid or expired reset token. Please request a new password reset."
            );
        }

    } catch (err) {
        logger.error(`[${requestId}] ChangePassword error: ${err.message}`, {
            stack: err.stack,
            duration: Date.now() - startTime,
            token: req.body.token ? maskToken(req.body.token) : 'undefined'
        });

        // Handle specific error types
        if (err.name === 'SequelizeValidationError') {
            return responseHandler.sendBadRequestResponse(res, "Invalid password format");
        }

        if (err.name === 'TokenExpiredError') {
            return responseHandler.sendUnauthorizedResponse(res, "Reset token has expired");
        }

        if (err.code === 'INVALID_TOKEN') {
            return responseHandler.sendUnauthorizedResponse(res, "Invalid reset token");
        }

        // Generic error response
        return responseHandler.sendInternalServerErrorResponse(res,
            "Unable to change password. Please try again."
        );
    }
};

exports.ChangeAccountPassword = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { oldPassword, newPassword } = req.body;
        const currentUser = req.userData;

        // Input validation
        if (!oldPassword || !newPassword || !userId) {
            return responseHandler.sendBadRequestResponse(res, "Missing required fields: oldPassword, newPassword, userId");
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return responseHandler.sendBadRequestResponse(res, "New password must be at least 8 characters long");
        }

        if (oldPassword === newPassword) {
            return responseHandler.sendBadRequestResponse(res, "New password cannot be the same as old password");
        }

        // Authorization check
        if (!authorization(currentUser, Operations.Update, await findUserByIdV2(userId))) {
            return responseHandler.sendUnauthorizedResponse(res, "You are not authorized to change this password");
        }

        // Attempt password change
        const record = await changeAccountPassword(oldPassword, newPassword, userId);

        if (!record) {
            return responseHandler.sendUnauthorizedResponse(res, "Invalid old password or user not found");
        }

        // Send email notification
        try {

            const template = await fsReadFileHtml('/email_templates/changedPasswordTemplate.ejs');
            const mailBody = ejs.render(template, { user: record, supportEmail: process.env.SUPPORT_EMAIL || '' });

            const emailConfiguration = {
                from: `collectly <${process.env.EMAIL1_USERNAME}>`,
                to: record.email,
                subject: "Password Changed Successfully",
                html: mailBody
            };

            await SendMail(emailConfiguration);

            // Log email sent (optional)
            console.log(`Password change notification sent to ${record.email}`);
        } catch (emailError) {
            // Log email error but don't fail the request
            console.error("Failed to send password change email:", emailError);
            // Continue with success response since password change was successful
        }

        // Return success response (exclude sensitive data)
        return responseHandler.sendSuccessResponse(res, {
            user: {
                id: record.id,
                email: record.email,
                updatedAt: record.updatedAt
            }
        }, "Password changed successfully");

    } catch (err) {
        console.error("ChangeAccountPassword error:", err);

        // Handle specific errors
        if (err.message?.includes('password') || err.name === 'ValidationError') {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }

        if (err.code === 'USER_NOT_FOUND') {
            return responseHandler.sendNotFoundResponse(res, "User not found");
        }

        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.CreateEmailVerificationRequest = async (req, res, next) => {
    let emailConfiguration = null;

    try {
        const { id } = req.params;

        const { callbackUrl } = req.body;

        // Validate user ID
        if (!id || isNaN(parseInt(id))) {
            return responseHandler.sendBadRequestResponse(res, "Invalid user ID");
        }

        const userId = parseInt(id);

        // Check if email is already verified
        let isVerified = await checkIfEmailIsVerified(userId);

        if (isVerified) {
            return responseHandler.sendBadRequestResponse(res, "Email is already verified");
        }

        // Create verification request
        let verificationRequest = await createUserEmailVerification(userId);

        if (!verificationRequest || !verificationRequest.User) {
            return responseHandler.sendInternalServerErrorResponse(res, "Failed to create verification request");
        }

        // Validate required data
        if (!verificationRequest.token) {
            return responseHandler.sendInternalServerErrorResponse(res, "Verification token missing");
        }

        if (!verificationRequest.User.email) {
            return responseHandler.sendInternalServerErrorResponse(res, "User email not found");
        }

        // Read email template
        const template = await fsReadFileHtml('/email_templates/userEmailVerificationTemplate.ejs');

        if (!template) {
            return responseHandler.sendInternalServerErrorResponse(res, "Email template not found");
        }

        // Create verification link
        const link = `${callbackUrl}?token=${encodeURIComponent(verificationRequest.token)}`;

        // Render email body
        let mailBody;
        try {
            mailBody = ejs.render(template, {
                user: verificationRequest.User,
                link: link,
                currentYear: new Date().getFullYear()
            });
        } catch (renderError) {
            console.error('EJS render error:', renderError);
            return responseHandler.sendInternalServerErrorResponse(res, "Failed to generate email content");
        }

        // Configure email
        emailConfiguration = {
            from: `collectly <${process.env.EMAIL1_USERNAME || process.env.EMAIL_USERNAME || 'noreply@collectly.com'}>`,
            to: verificationRequest.User.email,
            subject: 'Verify Your Email Address - collectly',
            html: mailBody,
            // Add text version for email clients that don't support HTML
            text: `Please verify your email address by clicking the following link: ${link}`
        };

        // Send verification email
        await SendMail(emailConfiguration);

        // Log the action (but don't expose sensitive data)
        console.log(`Email verification request sent to user ${userId}`);

        return responseHandler.sendSuccessResponse(res, {
            verificationRequest: true,
            message: "Verification email sent successfully"
        }, "Verification email sent successfully. Please check your inbox.");

    } catch (err) {
        console.error('CreateEmailVerificationRequest error:', {
            message: err.message,
            stack: err.stack,
            userId: req.params?.id
        });

        // Specific error handling for common issues
        if (err.code === 'EMAIL_SERVICE_ERROR') {
            return responseHandler.sendInternalServerErrorResponse(res, "Failed to send verification email. Please try again.");
        }

        if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeConnectionError') {
            return responseHandler.sendInternalServerErrorResponse(res, "Database error occurred. Please try again.");
        }

        return responseHandler.sendInternalServerErrorResponse(res, "Failed to process verification request");
    }
};

exports.MarkEmailVerified = async (req, res, next) => {
    try {
        const { token } = req.query;

        // Validate token parameter
        if (!token || typeof token !== 'string' || token.trim() === '') {
            return responseHandler.sendBadRequestResponse(res, "Verification token is required");
        }

        // Call the service method
        let verified = await markEmailVerified(token);

        // Handle different response scenarios
        if (verified && verified.alreadyVerified) {
            return responseHandler.sendSuccessResponse(res, {
                alreadyVerified: true,
                user: {
                    id: verified.userId,
                    email: verified.email,
                    firstName: verified.firstName,
                    lastName: verified.lastName
                }
            }, "Email was already verified. You can proceed to login.");
        }

        if (verified && verified.verified) {
            return responseHandler.sendSuccessResponse(res, {
                verified: true,
                user: {
                    id: verified.userId,
                    email: verified.email,
                    firstName: verified.firstName,
                    lastName: verified.lastName
                },
                redirectUrl: '/login?verified=true'
            }, "Email verified successfully! You can now login to your account.");
        }

        // If we get here but verified is false, it's an error
        return responseHandler.sendInternalServerErrorResponse(res, "Email verification failed");

    } catch (err) {
        console.error('MarkEmailVerified controller error:', {
            message: err.message,
            stack: err.stack,
            token: req.query?.token ? 'present' : 'missing'
        });

        // Handle specific error messages from service layer
        if (err.message.includes("Email already verified")) {
            return responseHandler.sendBadRequestResponse(res, "Email is already verified. You can proceed to login.");
        }

        if (err.message.includes("Please generate a new email verification request") ||
            err.message.includes("Verification link has expired")) {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }

        if (err.message.includes("No email verification request found") ||
            err.message.includes("Invalid verification token")) {
            return responseHandler.sendBadRequestResponse(res, "Invalid or expired verification link. Please request a new verification email.");
        }

        if (err.message.includes("User not found")) {
            return responseHandler.sendNotFoundResponse(res, "User account not found.");
        }

        // Handle database errors
        if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeConnectionError') {
            return responseHandler.sendInternalServerErrorResponse(res, "Database error occurred. Please try again.");
        }

        // Generic error response
        return responseHandler.sendInternalServerErrorResponse(res, "Failed to verify email. Please try again.");
    }
};

exports.DeleteAccount = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { password, reason } = req.body;
        const currentUser = req.userData;

        // Input validation
        if (!userId) {
            return responseHandler.sendBadRequestResponse(res, "User ID is required");
        }

        if (!password) {
            return responseHandler.sendBadRequestResponse(res, "Password is required to confirm account deletion");
        }

        // Verify user exists
        const user = await findUserByIdV2(userId);
        if (!user) {
            return responseHandler.sendNotFoundResponse(res, "User not found");
        }

        // Authorization check
        if (!authorization(currentUser, Operations.Delete, user)) {
            return responseHandler.sendUnauthorizedResponse(res, "You are not authorized to delete this account");
        }

        // Verify password before deletion
        let userPassword = await getUserPassword(userId);
        let validatePassword = await compareAsync(password, userPassword.password);

        if (!validatePassword) {
            logger.warn(`Failed account deletion attempt - invalid password for user ID: ${userId}`);
            return responseHandler.sendUnauthorizedResponse(res, "Invalid password. Please provide your current password to confirm account deletion.");
        }

        // Check if account already has a pending deletion request
        const existingRequests = await haveAccountMarkedForDeletion(userId);
        if (existingRequests.length > 0) {
            return responseHandler.sendBadRequestResponse(res, "Account deletion request is already pending");
        }

        // Create account deletion request
        const deletionRequest = await userDeleteRequest(userId, reason);

        if (!deletionRequest) {
            return responseHandler.sendInternalServerErrorResponse(res, "Failed to create account deletion request");
        }

        // Send email notifications
        try {
            // Email to user
            const template = await fsReadFileHtml('/email_templates/accountDeleteRequestTemplate.ejs');
            let mailBody = ejs.render(template, {
                user: user,
                deletionDate: new Date().toLocaleDateString(),
                estimatedCompletion: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString() // 14 days from now
            });

            let userEmailConfiguration = {
                from: `collectly <${process.env.EMAIL1_USERNAME}>`,
                to: user.email,
                subject: 'Account Deletion Request Received',
                html: mailBody
            };

            await SendMail(userEmailConfiguration);

            // Email to admin
            let adminEmailConfiguration = {
                from: `collectly <${process.env.EMAIL1_USERNAME}>`,
                to: process.env.ADMIN_EMAIL || process.env.EMAIL1_USERNAME,
                subject: `Account Deletion Request - User: ${user.username} (ID: ${user.id})`,
                html: `
                    <div style="font-family: Arial, sans-serif;">
                        <h2>Account Deletion Request</h2>
                        <p><strong>User Details:</strong></p>
                        <ul>
                            <li><strong>User ID:</strong> ${user.id}</li>
                            <li><strong>Username:</strong> ${user.username}</li>
                            <li><strong>Email:</strong> ${user.email}</li>
                            <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
                            <li><strong>Request Date:</strong> ${new Date().toLocaleString()}</li>
                            ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
                        </ul>
                        <p>This account deletion request is pending processing.</p>
                    </div>
                `
            };

            await SendMail(adminEmailConfiguration);

        } catch (mailErr) {
            logger.error(`Failed to send deletion notification emails: ${mailErr.message}`, {
                userId: userId,
                stack: mailErr.stack
            });
            // Continue with success response even if emails fail
        }

        // Log the deletion request
        logger.info(`Account deletion request created for user ID: ${userId}`, {
            userId: userId,
            username: user.username,
            email: user.email,
            reason: reason || 'No reason provided'
        });

        // Return success response with deletion request details
        return responseHandler.sendSuccessResponse(res, {
            deletionRequest: {
                id: deletionRequest.id,
                userId: deletionRequest.userId,
                isProcessed: deletionRequest.isProcessed,
                createdAt: deletionRequest.createdAt,
                estimatedCompletion: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
            },
            message: "Account deletion request submitted successfully. Your account will be permanently deleted after processing (usually within 14 days)."
        }, "Account deletion request submitted successfully");

    } catch (err) {
        logger.error(`DeleteAccount error: ${err.message}`, {
            userId: req.params.userId,
            stack: err.stack
        });

        // Handle specific error cases
        if (err.name === 'SequelizeDatabaseError') {
            return responseHandler.sendInternalServerErrorResponse(res, "Database error occurred while processing deletion request");
        }

        if (err.message && err.message.includes('deletion')) {
            return responseHandler.sendBadRequestResponse(res, err.message);
        }

        return responseHandler.sendInternalServerErrorResponse(res, "An error occurred while processing your account deletion request");
    }
}

exports.GetNotificationsUnRead = async (req, res, next) => {
    try {

        const { userId, page, pageSize } = req.params;

        const currentUser = req.userData;

        if (parseInt(userId) !== req.userData.id) {
            return responseHandler.sendUnauthorizedResponse(res, "Unauthorized to access these notifications");
        }

        const user = await findUserByIdV2(currentUser.id);

        if (!user) {
            return responseHandler.sendNotFoundResponse(res, "User not found");
        }


        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res, "Unauthorized to access these notifications");
        }

        const notifications = await GetNotifications(currentUser.id, false, parseInt(page), (pageSize) ? parseInt(pageSize) : 10);

        return responseHandler.sendSuccessResponse(res, notifications, "Success!");
    }
    catch (err) {
        logger.error(`GetNotificationsUnRead error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.GetNotifications = async (req, res, next) => {
    try {

        const { userId, page, pageSize } = req.params;

        const { isRead } = req.body;

        const currentUser = req.userData;

        if (parseInt(userId) !== req.userData.id) {
            return responseHandler.sendUnauthorizedResponse(res, "Unauthorized to access these notifications");
        }

        const user = await findUserByIdV2(currentUser.id);

        if (!user) {
            return responseHandler.sendNotFoundResponse(res, "User not found");
        }

        if (!authorization(currentUser, Operations.Read, user)) {
            return responseHandler.sendUnauthorizedResponse(res, "Unauthorized to access these notifications");
        }

        const notifications = await GetNotifications(currentUser.id, isRead, parseInt(page), (pageSize) ? parseInt(pageSize) : 10);

        return responseHandler.sendSuccessResponse(res, notifications, "Success!");
    }
    catch (err) {
        logger.error(`GetNotifications error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.MarkNotificationRead = async (req, res, next) => {
    try {
        const { notificationId } = req.params;
        const currentUser = req.userData;


        const notification = await GetNotificationById(notificationId);
        if (!notification) {
            return responseHandler.sendNotFoundResponse(res, "Notification not found");
        }

        if (notification.userToNotify !== currentUser.id) {
            return responseHandler.sendUnauthorizedResponse(res, "You are not authorized to mark this notification");
        }
        await MarkNotificationsAsRead(notificationId);
        return responseHandler.sendSuccessResponse(res, {}, "Notification marked as read");
    } catch (err) {
        logger.error(`MarkNotificationRead error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.NotificationDelete = async (req, res, next) => {
    try {
        const { notificationId } = req.params;
        const currentUser = req.userData;

        const notification = await GetNotificationById(notificationId);
        if (!notification) {
            return responseHandler.sendNotFoundResponse(res, "Notification not found");

        }
        if (notification.userToNotify !== currentUser.id) {
            return responseHandler.sendUnauthorizedResponse(res, "You are not authorized to delete this notification");
        }
        await DeleteNotification(notificationId);
        return responseHandler.sendSuccessResponse(res, {}, "Notification deleted successfully");
    } catch (err) {
        logger.error(`NotificationDelete error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
}

exports.DownloadPersonalData = async (req, res, next) => {
    try {
        const currentUser = req.userData;
        const { userId } = req.params;

        const user = await findUserByIdV2(userId);
        if (!user) {
            return responseHandler.sendNotFoundResponse(res, "User not found");
        }

        // Authorization check
        if (!authorization(currentUser, Operations.Delete, user)) {
            return responseHandler.sendUnauthorizedResponse(res, "You are not authorized to export this data");
        }

        const zipPath = await generateDataExport(userId);

        if (!zipPath) {
            return responseHandler.sendInternalServerErrorResponse(res, "Failed to generate export file");
        }

        // Generate JWT token with file information
        const token = jwt.sign(
            {
                filePath: zipPath,
                filename: path.basename(zipPath),
                userId: userId,
                type: 'data_export'
            },
            process.env.SECRET || 'Stay Home Stay Safe',
            { expiresIn: '15m' }
        );

        // Return the API endpoint path (not full URL)
        const downloadUrl = `/api/v1/auth/download-export/${token}`;

        logger.info(`Data export generated for user ${userId}`, {
            zipPath,
            downloadUrl
        });

        return responseHandler.sendSuccessResponse(res, {
            downloadUrl: downloadUrl,
            expiresIn: "15 minutes"
        }, "Data export generated successfully. Use the download link to get your data.");

    } catch (err) {
        logger.error(`DownloadPersonalData error: ${err.message}`, { stack: err.stack });
        return responseHandler.sendInternalServerErrorResponse(res);
    }
};

exports.DownloadExportFile = async (req, res, next) => {
    try {
        const { token } = req.params;

        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SECRET || 'Stay Home Stay Safe');
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return responseHandler.sendBadRequestResponse(res, "Download link has expired");
            }
            if (jwtError.name === 'JsonWebTokenError') {
                return responseHandler.sendBadRequestResponse(res, "Invalid download link");
            }
            throw jwtError;
        }

        const { filePath, filename, userId, type } = decoded;

        if (type !== 'data_export') {
            return responseHandler.sendBadRequestResponse(res, "Invalid download token");
        }

        // Use fs.promises for async operations
        const fs = require('fs').promises;
        const fsSync = require('fs');

        // Verify file exists synchronously first
        if (!fsSync.existsSync(filePath)) {
            logger.error(`Export file not found: ${filePath}`);
            return responseHandler.sendNotFoundResponse(res, "Export file not found or expired");
        }

        // Get file stats
        const stats = fsSync.statSync(filePath);

        // Set proper headers BEFORE sending any data
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Create read stream and pipe to response
        const fileStream = fsSync.createReadStream(filePath);

        fileStream.on('error', (error) => {
            logger.error(`File stream error: ${error.message}`);
            if (!res.headersSent) {
                responseHandler.sendInternalServerErrorResponse(res, "Error downloading file");
            }
        });

        fileStream.on('end', () => {
            logger.info(`File download completed: ${filename}`);

            // Schedule cleanup after 5 minutes
            setTimeout(async () => {
                try {
                    await fs.unlink(filePath);
                    logger.info(`Cleaned up export file: ${filePath}`);
                } catch (cleanupError) {
                    logger.warn(`Failed to cleanup file: ${cleanupError.message}`);
                }
            }, 5 * 60 * 1000);
        });

        // Pipe the file to response
        fileStream.pipe(res);

    } catch (err) {
        logger.error(`DownloadExportFile error: ${err.message}`, { stack: err.stack });

        if (!res.headersSent) {
            return responseHandler.sendInternalServerErrorResponse(res);
        }
    }
};



const AuthTokenGeneration = async (user) => {
    try {

        const token = await generateJWTToken(user.username, user.email, user.id);

        const refreshToken = await generateJWTRefreshToken(user.username, user.email, user.id);

        const existingAuthToken = await getAuthTokenByUserId(user.id);

        if (existingAuthToken) {
            await deleteAuthTokenByToken(user.id);
        }

        await createAuthToken({
            userId: user.id,
            refreshToken: refreshToken,
            createdAt: new Date(new Date().toUTCString())
        });

        return {
            user: user,
            token: token,
            refreshToken: refreshToken,
        }
    }
    catch (err) {
        throw err;
    }
}

const MobileAuthTokenGeneration = async (user) => {
    try {

        let token = generateJWTTokenMobile(user.username, user.email, user.id);

        return {
            user: user,
            token: token
        }
    }
    catch (err) {
        throw err;
    }
}

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

function validateAndSanitizeCallbackUrl(urlString) {
    try {
        const url = new URL(urlString);

        // Only allow HTTP/HTTPS
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }

        // Define allowed domains (you can configure this in environment variables)
        const allowedDomains = process.env.ALLOWED_CALLBACK_DOMAINS
            ? process.env.ALLOWED_CALLBACK_DOMAINS.split(',')
            : ['collectly.com', 'localhost']; // Default allowed domains

        const domain = url.hostname;
        const isAllowed = allowedDomains.some(allowed =>
            domain === allowed || domain.endsWith('.' + allowed)
        );

        if (!isAllowed) {
            return null;
        }

        // Sanitize: remove existing token parameters and return clean URL
        url.searchParams.delete('token');
        url.searchParams.delete('resetToken');

        return url.toString();
    } catch (_) {
        return null;
    }
}
