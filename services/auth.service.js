const bcrypt = require('bcrypt');
const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const moment = require('moment');
const {
    PoolsTypes,
    User,
    ForgotPassword,
    EventLog,
    Subscriptions,
    PoolsPlans,
    UserProjects,
    UserSettings,
    UserEmailVerifications,
    UserDeleteRequest
} = require('../models');
const { v4: uuid } = require('uuid');

const UserAttributes = [
    `id`,
    `username`,
    `firstName`,
    `lastName`,
    `photo_id`,
];

const ForgotPasswordAttributes = [
    `id`,
    `email`,
    `resetPasswordToken`
];

async function hashPassword(password) {
    const saltRounds = 10;

    const hashedPassword = await new Promise((resolve, reject) => {
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) reject(err)
            resolve(hash)
        });
    })

    return hashedPassword
}

async function compareAsync(password, hash) {

    const compare = await new Promise((resolve, reject) => {
        bcrypt.compare(password, hash, function (err, result) {
            if (err) reject(err)
            resolve(result)
        });
    })

    return compare
}

async function getUserPassword(id) {
    let result = {};
    try {
        result = await User.findOne({ where: { id: id }, attributes: [`password`] });
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function createUser(userData) {
    const { username, password, firstName, lastName, email, status, date_of_birth, phone, referral } = userData;
    const currentDateTime = new Date();

    const [existsWithUsername, existsWithEmail] = await Promise.all([
        User.findOne({ where: { username } }),
        User.findOne({ where: { email } })
    ]);

    if (existsWithUsername) throw new Error('USERNAME_ALREADY_EXISTS');
    if (existsWithEmail) throw new Error('EMAIL_ALREADY_EXISTS');

    const result = await sequelize.transaction(async (t) => {
        const newUser = await User.create({
            username,
            password: await hashPassword(password),
            firstName,
            lastName,
            email,
            status,
            date_of_birth,
            phone: `${phone}`,
            referral_code: uuid().toString().replace(/-/gi, ''),
            credits_earned: 0,
            createdAt: currentDateTime,
            updatedAt: currentDateTime
        }, { transaction: t });

        const freePlan = await PoolsPlans.findOne({
            where: { type: 'FREE' },
            transaction: t
        });

        await Promise.all([
            Subscriptions.create({
                subscriptionId: 'NONE',
                userId: newUser.id,
                planId: freePlan.id,
                subscription_renewal_amount: freePlan.price,
                status: 'ACTIVE',
                startDate: currentDateTime,
                createdAt: currentDateTime,
                updatedAt: currentDateTime
            }, { transaction: t }),

            UserSettings.create({
                notification: true,
                userId: newUser.id,
                createdAt: currentDateTime,
                updatedAt: currentDateTime
            }, { transaction: t })

        ]);

        // Return the user data directly instead of querying again
        return {
            ...newUser.toJSON(),
            photo: newUser.photo
                ? `${process.env.BASE_URL}/public/user/${newUser.id}/${newUser.photo}`
                : `${process.env.BASE_URL}/public/img/user.png`
        };
    });

    return result;
}

async function createForgotPassword(email) {
    let result = {};
    try {

        var currentDateTime = new Date(new Date().toUTCString());

        let user = await User.findOne({ where: { email: email } })

        if (user) {

            let resetPasswordToken = uuid();

            const expiresOn = moment().add(1, 'hour').toDate();

            let newForgotPassword = await ForgotPassword.create(
                {
                    userID: user.id,
                    resetPasswordToken: resetPasswordToken,
                    email: email,
                    expiresOn: expiresOn,
                    createdAt: currentDateTime,
                    isRequestCompleted: 0
                });

            result = await ForgotPassword.findOne({
                where: { id: newForgotPassword.id },
                attributes: ForgotPasswordAttributes
            });

            result.User = user;
        }

    }
    catch (err) {
        throw err;
    }
    return result;
}

async function updateForgotPasswordRequestComplete(resetPasswordToken) {
    let result = {};
    try {

        let currentForgotPassword = await ForgotPassword.findOne({
            where: {
                resetPasswordToken: resetPasswordToken
            }
        });

        if (currentForgotPassword) {

            await ForgotPassword.update({ isRequestCompleted: 1 },
                { where: { resetPasswordToken: resetPasswordToken } }
            );

            result = await ForgotPassword.findOne({
                where: {
                    resetPasswordToken: resetPasswordToken
                },
                attributes: ForgotPasswordAttributes
            });
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function verifyForgotPasswordRequest(resetPasswordToken) {
    let result = {};

    try {

        result = await ForgotPassword.findOne({
            where: {
                resetPasswordToken: resetPasswordToken,
                expiresOn: {
                    [Op.gt]: new Date() // Use current date directly
                }
            }
        });

    }
    catch (err) {
        throw err;
    }
    return result;
}

async function changePassword(token, password) {
    let result = {};
    try {

        let record = await ForgotPassword.findOne({
            where: {
                resetPasswordToken: token
            }
        });

        if (record) {

            let hash = await hashPassword(password);

            if (hash) {

                await User.update({ password: hash },
                    { where: { id: record.userID } }
                );

                result = await User.findOne({
                    where: {
                        id: record.userID
                    }
                });

            }
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function changeAccountPassword(oldPassword, newPassword, userId) {
    try {
        // Validate input parameters
        if (!oldPassword || !newPassword || !userId) {
            throw new Error('Missing required parameters: oldPassword, newPassword, and userId are required');
        }

        // Find user
        const user = await User.findOne({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Validate old password
        const isOldPasswordValid = await compareAsync(oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw new Error('Invalid old password');
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        await User.update(
            { password: hashedPassword },
            { where: { id: userId } }
        );

        // Fetch updated user with photo information
        const updatedUser = await User.findOne({
            attributes: UserAttributes.concat([
                [sequelize.literal(`(
                    SELECT 
                    f.name
                    FROM user u
                    LEFT JOIN files f ON u.photo_id = f.id
                    WHERE f.name IS NOT NULL
                    AND u.id = User.id
                )`), 'photo']
            ]),
            where: { id: userId }
        });

        // Format photo URL
        if (updatedUser) {
            updatedUser.photo = updatedUser.photo
                ? `${process.env.BASE_URL}/public/user/${updatedUser.id}/${updatedUser.photo}`
                : `${process.env.BASE_URL}/public/img/user.png`;
        }

        return updatedUser;

    } catch (error) {
        // Log the error for debugging
        console.error('Error changing account password:', error);

        // Re-throw with more context if it's not already a specific error
        if (error.message.includes('User not found') ||
            error.message.includes('Invalid old password') ||
            error.message.includes('Missing required parameters')) {
            throw error;
        }

        throw new Error('Failed to change password. Please try again.');
    }
}

async function findUserByEmail(email, url) {

    let result = {};
    try {

        const user = await User.findOne({ where: { email: email }, attributes: UserAttributes });

        const result = {
            ...user.toJSON(),
            photo: user.photo
                ? `${process.env.BASE_URL}/public/user/${user.id}/${user.photo}`
                : `${process.env.BASE_URL}/public/img/user.png`
        };
        return result;
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function findUserById(id) {

    let result = {};
    try {

        const user = await User.findOne({
            where: { id },
            attributes: [
                'id',
                'username',
                'email',
                'firstName',
                'lastName',
                'createdAt',
                [sequelize.literal(`(
            SELECT f.name 
            FROM files f 
            WHERE f.id = user.photo_id 
            AND f.name IS NOT NULL
        )`), 'photo']
            ]
        });

        const result = {
            ...user.toJSON(),
            photo: user.photo
                ? `${process.env.BASE_URL}/public/user/${user.id}/${user.photo}`
                : `${process.env.BASE_URL}/public/img/user.png`
        };
        return result;
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function findUserByIdV2(id) {
    try {

        const user = await User.findOne({
            where: { id },
            attributes: {
                include: [
                    [sequelize.literal(`(
                SELECT f.name 
                FROM files f 
                WHERE f.id = User.photo_id 
                AND f.name IS NOT NULL
                LIMIT 1
            )`), 'photo']
                ]
            }
        });

        if (!user) {
            return null;
        }

        user.setDataValue('photo', user.photo
            ? `${process.env.BASE_URL}/public/user/${user.id}/${user.photo}`
            : `${process.env.BASE_URL}/public/img/user.png`);

        return user;
    } catch (err) {
        throw err;
    }
}

async function findLoginUserByUsername(username, url) {

    let result = {};
    try {

        await User.findOne({
            attributes: [`id`,
                `username`,
                `email`,
                `firstName`,
                `lastName`,
                `photo_id`,
                'referral_code'
            ].concat([
                [sequelize.literal(`(
                    select 
                    f.name
                    from user u
                    left join files f
                    on u.photo_id = f.id
                    where f.name is not null
                    and u.id = User.id
                )`),
                    'photo'
                ]]),
            where: {
                username: username
            },
            raw: true
        }).then((dsResult) => {
            if (dsResult != null) {
                let user = dsResult;
                result = user;
                result.photo = (result.photo ? url + "/public/user/" + result.id + "/" + result.photo : url + "/assets/" + "img/user.png");
            } else {
                result = dsResult;
            }
        });

    }
    catch (err) {
        throw err;
    }
    return result;
}

async function createUserEmailVerification(userId) {
    let result = {};

    try {
        let verificationRequest = await UserEmailVerifications.create({
            token: uuid().toString().replace(/-/gi, ''),
            userId: userId,
            is_verified: false,
            status: true,
            expiresAt: moment().add(2, 'days'),
            createdAt: moment(),
            updatedAt: moment()
        });


        result = await UserEmailVerifications.findOne({
            include: [{
                model: User,
                required: false
            }],
            where: {
                id: verificationRequest.id
            }
        });
    }
    catch (err) {
        throw err;
    }

    return result;
}

async function checkIfEmailIsVerified(userId) {
    let result = false;
    try {

        await UserEmailVerifications.findOne({
            limit: 1,
            order: [
                ['createdAt', 'DESC']
            ],
            where: {
                userId: userId,
                is_verified: true
            }
        }).then(function (verificationResult) {
            if (verificationResult) {
                result = true;
            }
        });

    }
    catch (err) {
        throw err;
    }

    return result;
}

async function markEmailVerified(token) {
    let result = false;
    try {


        let verificationRequest = await UserEmailVerifications.findOne({
            limit: 1,
            order: [
                ['createdAt', 'DESC']
            ],
            where: {
                token: token
            }
        });

        if (verificationRequest) {

            if (verificationRequest.is_verified === true) {
                throw new Error("Email already verified.");
            }

            if (verificationRequest.status === false) {
                throw new Error("Please generate a new email verification request.");
            }

            if (verificationRequest.expiresAt < moment()) {
                throw new Error("Please generate a new email verification request.");
            }

            await UserEmailVerifications.update({
                is_verified: true,
                status: true
            }, {
                where: {
                    id: verificationRequest.id
                }
            });

            await UserEmailVerifications.findOne({
                where: {
                    id: verificationRequest.id
                }
            }).then(function (verificationResult) {
                if (verificationResult) {
                    result = verificationResult.is_verified;
                }
            });
        } else {
            throw new Error("No email verification request found.");
        }

    }
    catch (err) {
        throw err;
    }

    return result;
}

async function userDeleteRequest(userId, reason) {
    let result = {};

    try {

        var currentDateTime = new Date(new Date().toUTCString());

        const existingRequest = await UserDeleteRequest.findOne({
            where: {
                userId: userId,
                isProcessed: false
            }
        });

        if (existingRequest) {
            throw new Error('User already has a pending deletion request');
        }

        result = await UserDeleteRequest.create({
            userId: userId,
            isProcessed: false,
            comment: reason,
            createdAt: currentDateTime
        });
    }
    catch (err) {
        throw err;
    }

    return result;
}

async function haveAccountMarkedForDeletion(userId) {
    let result = false;

    try {

        result = await UserDeleteRequest.findAll({
            where: {
                userId: userId
            }
        })
    }
    catch (err) {
        throw err;
    }

    return result;
}



module.exports = {
    hashPassword,
    compareAsync,
    findLoginUserByUsername,
    createUser,
    createForgotPassword,
    updateForgotPasswordRequestComplete,
    verifyForgotPasswordRequest,
    findUserByEmail,
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
}

