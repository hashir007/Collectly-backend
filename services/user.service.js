const responseHandler = require('../utils/responseHandler');
const { Op, QueryTypes, Sequelize } = require("sequelize");
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
const { filterPools } = require('./pool.service.js');
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
    PoolsMembers,
    UserProjects,
    PoolJoinRequests,
    UserDeleteRequest
} = require('../models');



async function addUserReferrals(userId, code) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 100;

    try {
        // Validation
        if (!userId || !code) {
            throw new Error('User ID and referral code are required');
        }

        const referralCredit = parseFloat(process.env.REFERRAL_CREDIT);
        if (isNaN(referralCredit) || referralCredit <= 0) {
            throw new Error('Invalid referral credit value');
        }

        // Find referrer
        const referrerUser = await User.findOne({
            where: { referral_code: code }
        });

        if (!referrerUser) {
            throw new Error('Referral code not found');
        }

        if (referrerUser.id === userId) {
            throw new Error('Cannot use your own referral code');
        }

        // Check for existing referral
        const existingReferral = await UserReferral.findOne({
            where: {
                userId: userId,
                refer_userId: referrerUser.id
            }
        });

        if (existingReferral) {
            throw new Error('Referral already exists');
        }

        const currentDateTime = new Date();

        // Create referral
        const referral = await UserReferral.create({
            userId: userId,
            refer_userId: referrerUser.id,
            credits: referralCredit,
            createdAt: currentDateTime,
            updatedAt: currentDateTime
        });

        // Update referrer credits
        await User.update(
            {
                credits_earned: Sequelize.literal(`COALESCE(credits_earned, 0) + ${referralCredit}`)
            },
            {
                where: { id: referrerUser.id }
            }
        );

        // Update new user credits
        await User.update(
            { credits_earned: referralCredit },
            {
                where: { id: userId }
            }
        );

        return referral;

    } catch (err) {
        console.error('Error in addUserReferrals:', err.message);
        throw err;
    }
}

async function findUserByIdV1(id) {
    try {
        const user = await User.findOne({
            attributes: [
                'id',
                'firstName',
                'lastName',
                'username',
                'email',
                'date_of_birth',
                'phone',
                'status',
                'payout_email_address',
                'payout_payer_id',
                'photo_id',
                'referral_code',
                'credits_earned',
                [
                    sequelize.literal(`(
                        SELECT f.name
                        FROM user u
                        LEFT JOIN files f ON u.photo_id = f.id
                        WHERE f.name IS NOT NULL
                        AND u.id = User.id
                    )`),
                    'photo'
                ],
                [
                    sequelize.literal(`(
                        SELECT IFNULL(
                            (SELECT is_verified AS 'email_verified'
                             FROM user_email_verifications
                             WHERE userId = User.id
                             ORDER BY createdAt DESC
                             LIMIT 1), 
                            0
                        )
                    )`),
                    'email_verified'
                ]
            ],
            where: { id }
        });

        if (!user) {
            return null;
        }

        // Get photo URL
        const photoName = user.getDataValue('photo');
        const photoUrl = photoName
            ? `${process.env.BASE_URL}/public/user/${user.id}/${photoName}`
            : `${process.env.BASE_URL}/assets/img/user.png`;

        user.setDataValue('photoUrl', photoUrl);

        // Check if account is marked for deletion
        const hasDeletionRequest = await haveAccountMarkedForDeletion(user.id);
        user.setDataValue('accountDeletionRequest', hasDeletionRequest);

        return user;

    } catch (err) {
        throw err;
    }
}

async function findUserByIdV2(id) {
    try {
        const user = await User.findOne({ where: { id } });

        if (!user) {
            return null;
        }

        return user;
    } catch (err) {
        throw err;
    }
}

async function updateProfile(userId, profile) {
    try {
        const [updatedRows] = await User.update(
            {
                firstName: profile.firstName,
                lastName: profile.lastName,
                date_of_birth: profile.dateOfBirth,
                phone: profile.phone
            },
            {
                where: { id: userId }
            }
        );
        return updatedRows;
    }
    catch (err) {
        throw err;
    }
}

async function getPayoutDetails(userId) {
    try {

        const payout = await User.findOne({ attributes: ['id', 'payout_email_address', 'payout_payer_id'] }, { where: { id: userId } });

        if (!payout) {
            return null;
        }

        return payout;
    } catch (err) {
        throw err;
    }
}

async function updatePayoutDetails(userId, payout) {
    try {

        const [updatedRows] = await User.update(
            {
                payout_email_address: payout?.payoutEmailAddress,
                payout_payer_id: payout?.payoutPayerID
            },
            {
                where: { id: userId }
            }
        );
        return updatedRows

    } catch (err) {
        throw err;
    }
}

async function getAllContributionByUserId(userId, page = 1, pageSize = 5) {
    try {

        const offset = (page - 1) * pageSize;

        const result = await PoolsPayments.findAndCountAll({
            attributes: ['id', 'memberID', 'status', 'amount', 'transaction_id', 'createdAt'],
            include: [
                {
                    model: User,
                    attributes: ['id', 'username'],
                    required: false
                },
                {
                    model: Pools,
                    attributes: ['name', 'id'],
                    required: false
                },
            ],
            where: {
                memberID: userId
            },
            order: [
                ['createdAt', 'DESC'],
            ],
            limit: pageSize,
            offset: offset
        });

        return {
            transactions: result.rows,
            pagination: {
                currentPage: page,
                pageSize: pageSize,
                totalItems: result.count,
                totalPages: Math.ceil(result.count / pageSize),
                hasNextPage: page * pageSize < result.count,
                hasPreviousPage: page > 1
            }
        };

    } catch (err) {
        throw err;
    }
}

async function getSubscriptionHistory(userId, page = 1, pageSize = 5) {
    try {

        const offset = (page - 1) * pageSize;

        const result = await SubscriptionsHistories.findAndCountAll({
            include: [{
                model: PoolsPlans,
                required: true
            }],
            where: {
                userId: userId
            },
            order: [
                ['createdAt', 'DESC']
            ],
            limit: pageSize,
            offset: offset
        });

        return {
            transactions: result.rows,
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
        console.error('Error fetching subscription history:', err);
        throw err;
    }
}

async function getSubscription(userId) {
    let result = null;
    try {
        result = await Subscriptions.findOne({
            include: [{
                model: PoolsPlans,
                required: false
            }],
            where: {
                userId: userId
            }
        });
    }
    catch (err) {
        console.error('Error fetching subscription:', err);
        throw err;
    }
    return result;
}

async function getSubscriptionsPayments(userId, page = 1, pageSize = 5) {
    try {
        const offset = (page - 1) * pageSize;

        const result = await SubscriptionsPayments.findAndCountAll({
            where: {
                userId: userId
            },
            order: [
                ['createdAt', 'DESC']
            ],
            limit: pageSize,
            offset: offset
        });

        return {
            transactions: result.rows,
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
        console.error('Error fetching subscription payments:', err);
        throw err;
    }
}

async function getPoolPlans() {
    let result = null;
    try {
        result = await PoolsPlans.findAll();
    }
    catch (err) {
        console.error('Error fetching subscription plans:', err);
        throw err;
    }
    return result;
}

async function getSocialMediaByUserId(userId) {
    let result = {};
    try {

        result = await UserSocialMediaLinks.findAll({ where: { createdBy: userId } });

    }
    catch (err) {
        throw err;
    }
    return result;
}

async function addOrUpdateSocialMediaLinks(link, social_media, userId) {
    let result = {};
    try {
        await UserSocialMediaLinks.findOne({ where: { createdBy: createdBy } })
            .then(function (obj) {
                if (obj) {
                    UserSocialMediaLinks.update({
                        link: link,
                        social_media: social_media,
                        modifiedBy: userId
                    }, {
                        where: {
                            [Op.and]: [{
                                social_media: social_media
                            },
                            {
                                createdBy: userId
                            }]
                        }
                    });
                } else {
                    UserSocialMediaLinks.create({
                        link: link,
                        social_media: social_media,
                        createdBy: userId
                    });
                }
            });

        result = await UserSocialMediaLinks.findAll({ where: { createdBy: userId } });
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function getUserSettings(userId) {
    let result = {};

    try {

        result = await UserSettings.findOne({
            where: {
                userId: userId
            }
        });
    }
    catch (err) {
        throw err;
    }

    return result;
}

async function updateUserSettings(userId, settings) {
    let result = {};

    try {

        var currentDateTime = new Date(new Date().toUTCString());

        await UserSettings.findOne({
            where: {
                userId: userId
            }
        }).then(async function (obj) {
            if (obj) {

                let updateSettings = settings;
                updateSettings.updatedAt = currentDateTime;

                await UserSettings.update(updateSettings, {
                    where: {
                        userId: userId
                    }
                });
            } else {

                let addSettings = settings;
                settings.userId = userId;
                settings.createdAt = currentDateTime;
                settings.updatedAt = currentDateTime;

                await UserSettings.create(addSettings);
            }
        })

        result = await getUserSettings(userId);

    }
    catch (err) {
        throw err;
    }

    return result;
}

async function getMyApps(userId) {
    let result = [];
    try {

        result = await UserProjects.findAll({
            attributes: [
                'id',
                'name',
                'client_id',
                'client_secret',
                'createdAt'
            ],
            where: {
                userId: userId
            }
        });
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function getUserProjectsById(id) {
    let result = {};
    try {

        result = await UserProjects.findOne({
            attributes: [
                'id',
                'name',
                'client_id',
                'client_secret',
                'createdAt'
            ],
            where: {
                id: id
            }
        });
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function createApp(userId, name) {
    let result = {};
    try {

        const algorithm = 'aes-256-cbc';
        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);


        let user = await User.findOne({
            where: {
                id: userId
            }
        });
        const clientIdCipher = crypto.createCipheriv(algorithm, key, iv);
        let clientId = clientIdCipher.update(user.username, 'utf8', 'hex');
        clientId += clientIdCipher.final('hex');

        const clientSecretCipher = crypto.createCipheriv(algorithm, key, iv);
        let clientSecret = clientSecretCipher.update(user.password, 'utf8', 'hex');
        clientSecret += clientSecretCipher.final('hex');

        result = await UserProjects.create({
            userId: userId,
            name: name,
            client_id: clientId,
            client_secret: clientSecret,
            key: key.toString('hex'),
            iv: iv.toString('hex'),
            algorithm: algorithm
        });

    }
    catch (err) {
        throw err;
    }
    return result;
}

async function getUserReferrals(userId) {
    let result = {};
    try {

        result = await UserReferral.findAll({
            include: [
                {
                    model: User,
                    as: 'User',
                    required: true,
                    attributes: ['id', 'username'],
                },
                {
                    model: User,
                    as: 'ReferUser',
                    required: true,
                    attributes: ['id', 'username'],
                }
            ],
            where: {
                refer_userId: userId
            }
        });
    }
    catch (err) {
        throw err;
    }

    return result;
}

async function getUserByReferral(referral) {
    let result = {};
    try {

        result = await User.findAll({
            where: {
                referral_code: referral
            }
        });
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function getIdentityVerificationStatus(userId) {
    try {

        const user = await User.findOne({
            attributes: ['id', 'username'],
            where: {
                id: userId
            },
            attributes: {
                include: [
                    [
                        sequelize.literal(`IFNULL(
                               (SELECT is_verified
                                 FROM user_email_verifications
                                 WHERE userId = User.id
                                 ORDER BY createdAt DESC
                                 LIMIT 1), 
                                  0
                             )`),
                        'email_verified'
                    ]
                ]
            }
        });

        return user ? { 'email': user.getDataValue('email_verified') } : null;
    }
    catch (err) {
        throw err;
    }
}

async function uploadProfileImage(userId, fileToUpload) {
    if (!fileToUpload || Object.keys(fileToUpload).length === 0) {
        throw new Error('No files were uploaded.');
    }

    try {
        const currentDateTime = new Date();
        const uploadsDir = path.resolve('./', 'uploads/user/' + userId);

        // Ensure upload directory exists
        await fs.mkdir(uploadsDir, { recursive: true });

        const filename = `${moment().unix()}_${fileToUpload.name}`;
        const filePath = path.join(uploadsDir, filename);

        // Move the file
        await fileToUpload.mv(filePath);

        // Create file record in database
        const file = await Files.create({
            name: filename,
            original_name: fileToUpload.name,
            type: fileToUpload.mimetype,
            createdAt: currentDateTime
        });

        const fileResult = {
            url: `${process.env.BASE_URL}/public/user/${userId}/${filename}`,
            name: file.name,
            original_name: file.original_name,
            type: file.type,
            id: file.id
        };

        return fileResult;
    } catch (err) {
        // Log the error for debugging
        console.error('Error uploading user image:', err);
        throw err; // Re-throw the original error
    }
}

async function updateProfileImage(userId, fileId) {
    try {
        const user = await User.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        const oldFileId = user.photo_id;
        await User.update({ photo_id: fileId }, { where: { id: userId } });
        if (oldFileId) {
            await deleteProfileImage(oldFileId, userId);
        }
        return true;
    } catch (err) {
        console.error('Error updating user image:', err);
        throw err;
    }
}

async function deleteProfileImage(fileId, userId) {
    try {
        const file = await Files.findOne({ where: { id: fileId } });
        if (!file) {
            throw new Error('File not found');
        }
        const filePath = path.resolve('./', 'uploads/user/' + userId, file.name);

        try {
            await fs.unlink(filePath);
        }
        catch (fsErr) {
            console.warn('File deletion error (file may not exist):', fsErr);
        }

        await Files.destroy({ where: { id: fileId } });
        return true;
    } catch (err) {
        console.error('Error deleting user image:', err);
        throw err;
    }
}

async function addContactUs(firstName, lastName, email, message) {
    let result = {};
    try {

        var currentDateTime = new Date(new Date().toUTCString());

        result = await ContactUs.create({
            firstName: firstName,
            lastName: lastName,
            email: email,
            message: message,
            createdAt: currentDateTime,
            updatedAt: currentDateTime
        });

    } catch (err) {
        throw err;
    }
    return result;
}

async function getPoolStatisticsByUserId(userId, options = {}) {
    try {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const userIdInt = parseInt(userId, 10);
        if (Number.isNaN(userIdInt)) {
            throw new Error('Invalid User ID');
        }

        const { preset } = options;

        // Get date range based on preset
        let chartFromDate = null;
        let chartToDate = null;
        let granularity = 'monthly'; // Default granularity

        if (preset) {
            const dateRange = getDateRangeForPreset(preset);
            if (dateRange) {
                chartFromDate = dateRange.fromDate;
                chartToDate = dateRange.toDate;
                // Determine granularity based on preset
                granularity = getGranularityForPreset(preset);
            }
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const defaultPoolImage = `${baseUrl}/assets/img/pool-thumbnails/pool-1.png`;

        // Use the right filterPools signature
        const filterResult = await filterPools(
            1,              // page
            1000,           // pageSize
            null,           // term
            true,           // joined
            true,           // owner
            false,          // closed
            true,           // opened
            'most_recent',  // orderBy
            userIdInt       // userId
        );

        const allUserPools = filterResult.items || [];
        const totalPools = filterResult.total || allUserPools.length;
        const activePools = allUserPools.filter(pool => pool.status === 1).length;
        const inactivePools = allUserPools.filter(pool => pool.status === 0).length;

        // Get chart data with proper granularity
        const totalMoneyChartData = await getMoneyChartData(userIdInt, chartFromDate, chartToDate, granularity);
        const totalMembersChartData = await getMembersChartDataWithBreakdown(userIdInt, chartFromDate, chartToDate, granularity);

        // Get recent pools
        const recentPools = allUserPools.slice(0, 8);


        // Member statistics
        const memberTotals = (totalMembersChartData && totalMembersChartData.totals) || { joined: 0, invited: 0, total: 0 };
        const memberStats = {
            totalJoined: memberTotals.joined || 0,
            totalInvited: memberTotals.invited || 0,
            totalMembers: memberTotals.total || 0,
            conversionRate: memberTotals.invited > 0
                ? Math.round((memberTotals.joined / memberTotals.invited) * 100)
                : 0
        };

        return {
            totalPools,
            activePools,
            inactivePools,
            memberStats,
            totalMoneyChartData: {
                data: totalMoneyChartData,
                preset: preset || null,
                granularity: granularity,
                dateRange: { from: chartFromDate, to: chartToDate }
            },
            totalMembersChartData: {
                data: totalMembersChartData,
                preset: preset || null,
                granularity: granularity,
                dateRange: { from: chartFromDate, to: chartToDate }
            },
            recentPools
        };

    } catch (error) {
        console.error('Error in getPoolStatisticsByUserId:', error);
        throw new Error(`Failed to fetch user pool statistics: ${error.message}`);
    }
}

// New helper function to determine granularity based on preset
function getGranularityForPreset(preset) {
    switch (preset) {
        case 'This Week':
        case 'Last Week':
        case 'Last 2 Weeks':
            return 'daily'; // Show days for weekly ranges
        case 'Last Month':
            return 'weekly'; // Show weeks for a month
        case 'Last 3 Months':
            return 'monthly'; // Show months for 3 months
        default:
            return 'monthly';
    }
}

async function getMoneyChartData(userId, fromDate, toDate, granularity) {
    try {
        if (!fromDate || !toDate) {
            // Default to last 12 months if no dates
            const now = new Date();
            fromDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            granularity = 'monthly'; // Default to monthly for long ranges
        }

        // Use specified granularity or calculate based on date range
        if (!granularity) {
            const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 3600 * 24));
            granularity = daysDiff <= 30 ? 'daily' : (daysDiff <= 90 ? 'weekly' : 'monthly');
        }

        switch (granularity) {
            case 'daily':
                return await getDailyMoneyData(userId, fromDate, toDate);
            case 'weekly':
                return await getWeeklyMoneyData(userId, fromDate, toDate);
            case 'monthly':
                return await getMonthlyMoneyData(userId, fromDate, toDate);
            default:
                return await getMonthlyMoneyData(userId, fromDate, toDate);
        }

    } catch (error) {
        console.error('Error getting money chart data:', error);
        return getDefaultMoneyData(fromDate, toDate, granularity);
    }
}

async function getMembersChartDataWithBreakdown(userId, fromDate, toDate, granularity) {
    try {
        if (!fromDate || !toDate) {
            // Default to last 30 days if no dates
            const now = new Date();
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            toDate = now;
            granularity = 'daily'; // Default to daily for short ranges
        }

        // Get user's pool IDs
        const userPoolIds = await getUserPoolIds(userId);

        if (!userPoolIds || userPoolIds.length === 0) {
            return getEmptyChartDataWithBreakdown(fromDate, toDate, granularity);
        }

        // Use specified granularity or calculate based on date range
        if (!granularity) {
            const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 3600 * 24));
            granularity = daysDiff <= 30 ? 'daily' : (daysDiff <= 90 ? 'weekly' : 'monthly');
        }

        return await getMembersDataWithBreakdown(userPoolIds, fromDate, toDate, granularity);

    } catch (error) {
        console.error('Error getting members chart data:', error);
        return getEmptyChartDataWithBreakdown(fromDate, toDate, granularity);
    }
}

// NEW: Daily money data function
async function getDailyMoneyData(userId, fromDate, toDate) {
    try {
        const chartData = [];
        const start = moment(fromDate).startOf('day');
        const end = moment(toDate).endOf('day');

        let currentDay = start.clone();

        while (currentDay.isSameOrBefore(end)) {
            const dayStart = currentDay.clone().startOf('day').toDate();
            const dayEnd = currentDay.clone().endOf('day').toDate();

            const dayContributionsRaw = await PoolsPayments.sum('amount', {
                where: {
                    memberID: userId,
                    status: 'completed',
                    createdAt: { [Op.between]: [dayStart, dayEnd] }
                }
            }) || 0;

            const dayContributions = typeof dayContributionsRaw === 'string'
                ? parseFloat(dayContributionsRaw)
                : Number(dayContributionsRaw) || 0;

            // Get day name (Monday, Tuesday, etc.)
            const dayName = currentDay.format('dddd'); // Full day name
            const shortDate = currentDay.format('MMM DD'); // For label

            chartData.push({
                label: dayName, // "Monday", "Tuesday", etc.
                shortLabel: shortDate, // "Jan 15", "Jan 16", etc.
                amount: parseFloat(dayContributions.toFixed(2))
            });

            currentDay.add(1, 'day');
        }

        return chartData;
    } catch (error) {
        console.error('Error getting daily money data:', error);
        return [];
    }
}

// Update getWeeklyMoneyData to use proper week labels
async function getWeeklyMoneyData(userId, fromDate, toDate) {
    try {
        const chartData = [];
        const start = moment(fromDate).startOf('isoWeek');
        const end = moment(toDate);

        let currentWeek = start.clone();
        let weekNumber = 1;

        while (currentWeek.isSameOrBefore(end)) {
            const weekStart = currentWeek.clone().startOf('isoWeek').toDate();
            let weekEnd = currentWeek.clone().endOf('isoWeek').toDate();
            if (weekEnd > toDate) weekEnd = toDate;

            const weekContributionsRaw = await PoolsPayments.sum('amount', {
                where: {
                    memberID: userId,
                    status: 'completed',
                    createdAt: { [Op.between]: [weekStart, weekEnd] }
                }
            }) || 0;

            const weekContributions = typeof weekContributionsRaw === 'string'
                ? parseFloat(weekContributionsRaw)
                : Number(weekContributionsRaw) || 0;

            // Format: "Week 1 (Jan 1-7)"
            const weekStartFormatted = currentWeek.format('MMM D');
            const weekEndFormatted = currentWeek.clone().endOf('isoWeek').format('MMM D');
            const weekLabel = `Week ${weekNumber} (${weekStartFormatted} - ${weekEndFormatted})`;

            chartData.push({
                label: weekLabel,
                shortLabel: `Week ${weekNumber}`,
                amount: parseFloat(weekContributions.toFixed(2))
            });

            currentWeek.add(1, 'week');
            weekNumber++;
        }

        return chartData;
    } catch (error) {
        console.error('Error getting weekly money data:', error);
        return [];
    }
}

// Update getMonthlyMoneyData
async function getMonthlyMoneyData(userId, fromDate, toDate) {
    try {
        const chartData = [];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        let current = moment(fromDate).startOf('month');

        while (current.isSameOrBefore(moment(toDate))) {
            const monthStart = current.clone().startOf('month').toDate();
            let monthEnd = current.clone().endOf('month').toDate();
            if (monthEnd > toDate) monthEnd = toDate;

            const monthContributionsRaw = await PoolsPayments.sum('amount', {
                where: {
                    memberID: userId,
                    status: 'completed',
                    createdAt: { [Op.between]: [monthStart, monthEnd] }
                }
            }) || 0;

            const monthContributions = typeof monthContributionsRaw === 'string'
                ? parseFloat(monthContributionsRaw)
                : Number(monthContributionsRaw) || 0;

            const monthLabel = `${monthNames[current.month()]} ${current.year()}`;
            const shortLabel = `${current.format('MMM')} '${current.year().toString().substring(2)}`;

            chartData.push({
                label: monthLabel,
                shortLabel: shortLabel,
                amount: parseFloat(monthContributions.toFixed(2))
            });

            current.add(1, 'month');
        }

        return chartData;
    } catch (error) {
        console.error('Error getting monthly money data:', error);
        return [];
    }
}

// Update getMembersDataWithBreakdown to support 'monthly' granularity
async function getMembersDataWithBreakdown(poolIds, fromDate, toDate, granularity = 'daily') {
    try {
        let dateExpression;
        let alias;

        switch (granularity) {
            case 'daily':
                dateExpression = [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'];
                alias = 'date';
                break;
            case 'weekly':
                dateExpression = [sequelize.fn('YEARWEEK', sequelize.col('createdAt'), 1), 'week'];
                alias = 'week';
                break;
            case 'monthly':
                dateExpression = [
                    sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'),
                    'month'
                ];
                alias = 'month';
                break;
            default:
                dateExpression = [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'];
                alias = 'date';
        }

        const joinedResults = await PoolsMembers.findAll({
            attributes: [
                dateExpression,
                [sequelize.fn('COUNT', sequelize.col('id')), 'joinedCount']
            ],
            where: {
                poolID: { [Op.in]: poolIds },
                ...(fromDate && toDate && {
                    createdAt: { [Op.between]: [fromDate, toDate] }
                })
            },
            group: [alias],
            order: [[alias, 'ASC']],
            raw: true
        });

        const invitedResults = await PoolJoinRequests.findAll({
            attributes: [
                dateExpression,
                [sequelize.fn('COUNT', sequelize.col('id')), 'invitedCount']
            ],
            where: {
                poolID: { [Op.in]: poolIds },
                status: 0, // pending invitations
                ...(fromDate && toDate && {
                    createdAt: { [Op.between]: [fromDate, toDate] }
                })
            },
            group: [alias],
            order: [[alias, 'ASC']],
            raw: true
        });

        return formatChartDataWithBreakdown(joinedResults, invitedResults, fromDate, toDate, granularity);
    } catch (error) {
        console.error(`Error in getMembersDataWithBreakdown (${granularity}):`, error);
        return getEmptyChartDataWithBreakdown(fromDate, toDate, granularity);
    }
}

// Update formatChartDataWithBreakdown to support monthly granularity
function formatChartDataWithBreakdown(joinedData, invitedData, fromDate, toDate, granularity = 'daily') {
    if ((!joinedData || joinedData.length === 0) && (!invitedData || invitedData.length === 0)) {
        return getEmptyChartDataWithBreakdown(fromDate, toDate, granularity);
    }

    const labels = [];
    const joinedValues = [];
    const invitedValues = [];

    const joinedMap = {};
    const invitedMap = {};

    // Populate maps based on granularity
    if (joinedData && joinedData.length > 0) {
        joinedData.forEach(item => {
            const key = item[granularity]?.toString() || '';
            joinedMap[key] = parseInt(item.joinedCount, 10) || 0;
        });
    }

    if (invitedData && invitedData.length > 0) {
        invitedData.forEach(item => {
            const key = item[granularity]?.toString() || '';
            invitedMap[key] = parseInt(item.invitedCount, 10) || 0;
        });
    }

    if (fromDate && toDate) {
        const start = moment(fromDate);
        const end = moment(toDate);

        switch (granularity) {
            case 'daily':
                for (let m = start.clone(); m.isSameOrBefore(end); m.add(1, 'days')) {
                    const dateKey = m.format('YYYY-MM-DD');
                    labels.push(m.format('dddd')); // Monday, Tuesday, etc.
                    joinedValues.push(joinedMap[dateKey] || 0);
                    invitedValues.push(invitedMap[dateKey] || 0);
                }
                break;

            case 'weekly':
                let currentWeek = start.clone().startOf('isoWeek');
                while (currentWeek.isSameOrBefore(end)) {
                    const weekKey = currentWeek.format('GGGGWW'); // ISO week-year + week number
                    labels.push(`Week ${currentWeek.isoWeek()}`);
                    joinedValues.push(joinedMap[weekKey] || joinedMap[parseInt(weekKey, 10).toString()] || 0);
                    invitedValues.push(invitedMap[weekKey] || invitedMap[parseInt(weekKey, 10).toString()] || 0);
                    currentWeek.add(1, 'week');
                }
                break;

            case 'monthly':
                let currentMonth = start.clone().startOf('month');
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

                while (currentMonth.isSameOrBefore(end)) {
                    const monthKey = currentMonth.format('YYYY-MM');
                    labels.push(`${monthNames[currentMonth.month()]} ${currentMonth.year()}`);
                    joinedValues.push(joinedMap[monthKey] || 0);
                    invitedValues.push(invitedMap[monthKey] || 0);
                    currentMonth.add(1, 'month');
                }
                break;
        }
    }

    const totalJoined = joinedValues.reduce((sum, v) => sum + (v || 0), 0);
    const totalInvited = invitedValues.reduce((sum, v) => sum + (v || 0), 0);

    return {
        labels,
        datasets: [
            {
                label: 'Joined Members',
                data: joinedValues,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            },
            {
                label: 'Invited Members',
                data: invitedValues,
                backgroundColor: 'rgba(255, 159, 64, 0.6)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }
        ],
        totals: {
            joined: totalJoined,
            invited: totalInvited,
            total: totalJoined + totalInvited
        },
        granularity: granularity
    };
}

// Update getEmptyChartDataWithBreakdown for monthly granularity
function getEmptyChartDataWithBreakdown(fromDate, toDate, granularity = 'daily') {
    const labels = [];
    const joinedValues = [];
    const invitedValues = [];

    if (!fromDate || !toDate) {
        return {
            labels,
            datasets: [
                {
                    label: 'Joined Members',
                    data: joinedValues,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Invited Members',
                    data: invitedValues,
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }
            ],
            totals: {
                joined: 0,
                invited: 0,
                total: 0
            },
            granularity: granularity
        };
    }

    const start = moment(fromDate);
    const end = moment(toDate);

    switch (granularity) {
        case 'daily':
            for (let m = start.clone(); m.isSameOrBefore(end); m.add(1, 'days')) {
                labels.push(m.format('dddd')); // Monday, Tuesday, etc.
                joinedValues.push(0);
                invitedValues.push(0);
            }
            break;

        case 'weekly':
            let currentWeek = start.clone().startOf('isoWeek');
            const endWeek = end.clone().endOf('isoWeek');

            while (currentWeek.isSameOrBefore(endWeek)) {
                labels.push(`Week ${currentWeek.isoWeek()}`);
                joinedValues.push(0);
                invitedValues.push(0);
                currentWeek.add(1, 'week');
            }
            break;

        case 'monthly':
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

            let currentMonth = start.clone().startOf('month');
            const endMonth = end.clone().endOf('month');

            while (currentMonth.isSameOrBefore(endMonth)) {
                labels.push(`${monthNames[currentMonth.month()]} ${currentMonth.year()}`);
                joinedValues.push(0);
                invitedValues.push(0);
                currentMonth.add(1, 'month');
            }
            break;
    }

    return {
        labels,
        datasets: [
            {
                label: 'Joined Members',
                data: joinedValues,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            },
            {
                label: 'Invited Members',
                data: invitedValues,
                backgroundColor: 'rgba(255, 159, 64, 0.6)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }
        ],
        totals: {
            joined: 0,
            invited: 0,
            total: 0
        },
        granularity: granularity
    };
}

// Update getDefaultMoneyData for granularity
function getDefaultMoneyData(fromDate, toDate, granularity = 'monthly') {
    if (!fromDate || !toDate) return [];

    const start = moment(fromDate);
    const end = moment(toDate);

    switch (granularity) {
        case 'daily':
            const dailyLabels = [];
            for (let m = start.clone(); m.isSameOrBefore(end); m.add(1, 'days')) {
                dailyLabels.push(m.format('dddd')); // Monday, Tuesday, etc.
            }
            return dailyLabels.map(label => ({ label, amount: 0 }));

        case 'weekly':
            const weeklyLabels = [];
            let currentWeek = start.clone().startOf('isoWeek');
            const endWeek = end.clone().endOf('isoWeek');

            while (currentWeek.isSameOrBefore(endWeek)) {
                weeklyLabels.push(`Week ${currentWeek.isoWeek()}`);
                currentWeek.add(1, 'week');
            }
            return weeklyLabels.map(label => ({ label, amount: 0 }));

        case 'monthly':
        default:
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            const monthlyLabels = [];

            let currentMonth = start.clone().startOf('month');
            const endMonth = end.clone().endOf('month');

            while (currentMonth.isSameOrBefore(endMonth)) {
                monthlyLabels.push(`${monthNames[currentMonth.month()]} ${currentMonth.year()}`);
                currentMonth.add(1, 'month');
            }
            return monthlyLabels.map(label => ({ label, amount: 0 }));
    }
}

function getDateRangeForPreset(preset) {
    const now = moment().startOf('day'); // Start of today
    const today = now.toDate();

    switch (preset) {
        case 'This Week': {
            // ISO week (Monday to Sunday)
            const startOfWeek = moment(now).startOf('isoWeek').toDate(); // Monday
            const endOfWeek = moment(now).endOf('isoWeek').toDate();    // Sunday
            return {
                fromDate: startOfWeek,
                toDate: endOfWeek
            };
        }

        case 'Last Week': {
            // Previous ISO week (Monday to Sunday)
            const startOfLastWeek = moment(now).subtract(1, 'week').startOf('isoWeek').toDate();
            const endOfLastWeek = moment(startOfLastWeek).endOf('isoWeek').toDate();
            return {
                fromDate: startOfLastWeek,
                toDate: endOfLastWeek
            };
        }

        case 'Last 2 Weeks': {
            // Last 14 days (including today)
            const end = moment(now).endOf('day').toDate(); // End of today
            const start = moment(now).subtract(13, 'days').startOf('day').toDate(); // 14 days ago
            return {
                fromDate: start,
                toDate: end
            };
        }

        case 'Last Month': {
            // Previous full calendar month
            const start = moment(now).subtract(1, 'month').startOf('month').toDate();
            const end = moment(now).subtract(1, 'month').endOf('month').toDate();
            return {
                fromDate: start,
                toDate: end
            };
        }

        case 'Last 3 Months': {
            // Last 90 days (including today)
            const end = moment(now).endOf('day').toDate(); // End of today
            const start = moment(now).subtract(89, 'days').startOf('day').toDate(); // 90 days ago
            return {
                fromDate: start,
                toDate: end
            };
        }

        case 'This Month': {
            // Current month (from 1st to today)
            const start = moment(now).startOf('month').toDate();
            const end = moment(now).endOf('day').toDate();
            return {
                fromDate: start,
                toDate: end
            };
        }

        case 'This Year': {
            // Current year (from Jan 1 to today)
            const start = moment(now).startOf('year').toDate();
            const end = moment(now).endOf('day').toDate();
            return {
                fromDate: start,
                toDate: end
            };
        }

        case 'Last Year': {
            // Previous full year
            const start = moment(now).subtract(1, 'year').startOf('year').toDate();
            const end = moment(now).subtract(1, 'year').endOf('year').toDate();
            return {
                fromDate: start,
                toDate: end
            };
        }

        case 'Last 6 Months': {
            // Last 180 days (including today)
            const end = moment(now).endOf('day').toDate();
            const start = moment(now).subtract(179, 'days').startOf('day').toDate();
            return {
                fromDate: start,
                toDate: end
            };
        }

        case 'Last 12 Months': {
            // Last 365 days (including today)
            const end = moment(now).endOf('day').toDate();
            const start = moment(now).subtract(364, 'days').startOf('day').toDate();
            return {
                fromDate: start,
                toDate: end
            };
        }

        case 'Today': {
            // Just today
            const start = moment(now).startOf('day').toDate();
            const end = moment(now).endOf('day').toDate();
            return {
                fromDate: start,
                toDate: end
            };
        }

        case 'Yesterday': {
            // Previous day
            const start = moment(now).subtract(1, 'day').startOf('day').toDate();
            const end = moment(now).subtract(1, 'day').endOf('day').toDate();
            return {
                fromDate: start,
                toDate: end
            };
        }

        default: {
            // Default to last 30 days
            const end = moment(now).endOf('day').toDate();
            const start = moment(now).subtract(29, 'days').startOf('day').toDate();
            return {
                fromDate: start,
                toDate: end
            };
        }
    }
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

async function getUserPoolIds(userId) {
    try {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const userIdInt = parseInt(userId, 10);
        if (Number.isNaN(userIdInt)) {
            throw new Error('Invalid User ID');
        }

        // Use filterPools to get all pools the user is associated with
        const filterResult = await filterPools(
            1,              // page
            1000,           // pageSize - high number to get all pools
            null,           // term
            true,           // joined - include pools user has joined
            true,           // owner - include pools user owns
            false,          // closed
            true,           // opened
            'most_recent',  // orderBy
            userIdInt       // userId
        );

        // Extract pool IDs from the result
        const poolIds = filterResult.items?.map(pool => pool.id) || [];

        return poolIds;

    } catch (error) {
        console.error('Error in getUserPoolIds:', error);
        throw new Error(`Failed to fetch user pool IDs: ${error.message}`);
    }
}


module.exports = {
    addUserReferrals,
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
    getUserByReferral,
    getPoolStatisticsByUserId
};