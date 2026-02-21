const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const path = require('path');
const moment = require('moment');
const fs = require('fs').promises;
const {
    fsReadFileHtml
} = require("../utils/fileHandler.js");
const smsTemplate = require('../sms_templates/messages.json');

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
    UserConnections,
    PoolJoinRequests,
    Files,
    PoolVotingSettings,
    PoolReport
} = require('../models/index.js');

const {
    SendEmailNotification,
    SendSMSNotification,
    SendAppNotification
} = require("./notification.service.js");


async function submitReport(reportData) {
    try {
        const {
            poolId,
            reporterId,
            categories,
            primaryReason,
            additionalDetails
        } = reportData;

        // Validate required fields
        if (!poolId || !categories || categories.length === 0) {
            throw new Error('Pool ID and at least one category are required');
        }

        // Check if pool exists
        const pool = await Pools.findByPk(poolId);
        if (!pool) {
            throw new Error('Pool not found');
        }

        // Check for duplicate active reports
        const existingReport = await PoolReport.findOne({
            where: {
                poolId,
                reporterId,
                status: ['pending', 'under_review']
            }
        });

        if (existingReport) {
            throw new Error('You have already submitted an active report for this pool');
        }
       
        const severity = _calculateReportSeverity(categories);
       
        const report = await PoolReport.create({
            poolID: poolId,
            reporterId,
            categories,
            primaryReason: primaryReason || null,
            additionalDetails: additionalDetails || null,
            severity,
            status: 'pending'
        });

        return report;
    } catch (error) {
        console.error('Error in submitReport:', error);
        throw new Error(`Failed to submit report: ${error.message}`);
    }
}

async function getReportById(reportId) {
    try {
        const report = await PoolReport.findByPk(reportId, {
            include: [
                {
                    model: Pools,
                    as: 'pool',
                    attributes: ['id', 'name', 'status', 'ownerID', 'total_contributed', 'goal_amount'],
                    include: [{
                        model: User,
                        as: 'poolOwner',
                        attributes: ['id', 'username', 'firstName', 'lastName', 'email']
                    }]
                },
                {
                    model: User,
                    as: 'reporter',
                    attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'photo_id']
                },
                {
                    model: User,
                    as: 'resolvedByAdmin',
                    attributes: ['id', 'username', 'firstName', 'lastName'],
                    required: false
                }
            ]
        });

        if (!report) {
            throw new Error('PoolReport not found');
        }

        return _processReportData(report);
    } catch (error) {
        console.error('Error in getReportById:', error);
        throw new Error(`Failed to get report: ${error.message}`);
    }
}

async function updateReportStatus(reportId, updateData) {
    const transaction = await sequelize.transaction();

    try {
        const { status, adminNotes, resolvedBy } = updateData;

        const report = await PoolReport.findByPk(reportId);
        if (!report) {
            throw new Error('PoolReport not found');
        }

        const validStatuses = ['pending', 'under_review', 'resolved', 'dismissed'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status');
        }

        const updateFields = { status };

        if (adminNotes) {
            updateFields.adminNotes = adminNotes;
        }

        if (status === 'resolved' || status === 'dismissed') {
            updateFields.resolvedAt = new Date();
            updateFields.resolvedBy = resolvedBy;
        }

        await report.update(updateFields, { transaction });

        // If report is resolved as critical, you might want to take additional actions
        if (status === 'resolved' && report.severity === 'critical') {
            await _handleCriticalReportResolution(report, transaction);
        }

        await transaction.commit();
        return await getReportById(reportId);
    } catch (error) {
        await transaction.rollback();
        console.error('Error in updateReportStatus:', error);
        throw new Error(`Failed to update report status: ${error.message}`);
    }
}

async function deleteReport(reportId, deletedBy) {
    try {
        const report = await PoolReport.findByPk(reportId);
        if (!report) {
            throw new Error('PoolReport not found');
        }

        // Soft delete by updating status
        await report.update({
            status: 'dismissed',
            resolvedAt: new Date(),
            resolvedBy: deletedBy,
            adminNotes: `PoolReport deleted by admin ${deletedBy}`
        });

        return true;
    } catch (error) {
        console.error('Error in deleteReport:', error);
        throw new Error(`Failed to delete report: ${error.message}`);
    }
}



async function getReportsByPool(poolId, options = {}) {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            severity,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = options;

        const whereClause = { poolId };
        if (status) whereClause.status = status;
        if (severity) whereClause.severity = severity;

        const reports = await PoolReport.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'reporter',
                    attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'photo_id']
                }
            ],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        const processedReports = await Promise.all(
            reports.rows.map(report => _processReportData(report))
        );

        return {
            reports: processedReports,
            totalCount: reports.count,
            currentPage: parseInt(page),
            totalPages: Math.ceil(reports.count / parseInt(limit))
        };
    } catch (error) {
        console.error('Error in getReportsByPool:', error);
        throw new Error(`Failed to get pool reports: ${error.message}`);
    }
}

async function getReportsByUser(userId, options = {}) {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = options;

        const whereClause = { reporterId: userId };
        if (status) whereClause.status = status;

        const reports = await PoolReport.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Pools,
                    as: 'pool',
                    attributes: ['id', 'name', 'status', 'ownerID'],
                    include: [{
                        model: User,
                        as: 'poolOwner',
                        attributes: ['id', 'username', 'firstName', 'lastName']
                    }]
                }
            ],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        return {
            reports: reports.rows,
            totalCount: reports.count,
            currentPage: parseInt(page),
            totalPages: Math.ceil(reports.count / parseInt(limit))
        };
    } catch (error) {
        console.error('Error in getReportsByUser:', error);
        throw new Error(`Failed to get user reports: ${error.message}`);
    }
}

async function getAllReports(options = {}) {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            severity,
            dateFrom,
            dateTo,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            search
        } = options;

        const whereClause = {};

        if (status) whereClause.status = status;
        if (severity) whereClause.severity = severity;

        // Date range filter
        if (dateFrom || dateTo) {
            whereClause.createdAt = {};
            if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
            if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
        }

        // Search filter
        if (search) {
            whereClause[Op.or] = [
                { primaryReason: { [Op.like]: `%${search}%` } },
                { additionalDetails: { [Op.like]: `%${search}%` } },
                { '$pool.name$': { [Op.like]: `%${search}%` } },
                { '$reporter.username$': { [Op.like]: `%${search}%` } }
            ];
        }

        const reports = await PoolReport.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Pools,
                    as: 'pool',
                    attributes: ['id', 'name', 'status', 'ownerID'],
                    include: [{
                        model: User,
                        as: 'poolOwner',
                        attributes: ['id', 'username', 'firstName', 'lastName']
                    }]
                },
                {
                    model: User,
                    as: 'reporter',
                    attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'photo_id']
                },
                {
                    model: User,
                    as: 'resolvedByAdmin',
                    attributes: ['id', 'username', 'firstName', 'lastName'],
                    required: false
                }
            ],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            distinct: true
        });

        const processedReports = await Promise.all(
            reports.rows.map(report => _processReportData(report))
        );

        return {
            reports: processedReports,
            totalCount: reports.count,
            currentPage: parseInt(page),
            totalPages: Math.ceil(reports.count / parseInt(limit))
        };
    } catch (error) {
        console.error('Error in getAllReports:', error);
        throw new Error(`Failed to get all reports: ${error.message}`);
    }
}



async function getReportStatistics(timeRange = '30days') {
    try {
        let dateFilter = {};
        const now = new Date();

        switch (timeRange) {
            case '7days':
                dateFilter = { createdAt: { [Op.gte]: new Date(now.setDate(now.getDate() - 7)) } };
                break;
            case '30days':
                dateFilter = { createdAt: { [Op.gte]: new Date(now.setDate(now.getDate() - 30)) } };
                break;
            case '90days':
                dateFilter = { createdAt: { [Op.gte]: new Date(now.setDate(now.getDate() - 90)) } };
                break;
            case '1year':
                dateFilter = { createdAt: { [Op.gte]: new Date(now.setFullYear(now.getFullYear() - 1)) } };
                break;
            default:
                dateFilter = { createdAt: { [Op.gte]: new Date(now.setDate(now.getDate() - 30)) } };
        }

        // Status statistics
        const statusStats = await PoolReport.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: dateFilter,
            group: ['status'],
            raw: true
        });

        // Severity statistics
        const severityStats = await PoolReport.findAll({
            attributes: [
                'severity',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: dateFilter,
            group: ['severity'],
            raw: true
        });

        // Category statistics
        const categoryStats = await PoolReport.findAll({
            attributes: [
                [sequelize.literal('JSON_UNQUOTE(JSON_EXTRACT(categories, "$[0]"))'), 'category'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: dateFilter,
            group: [sequelize.literal('JSON_UNQUOTE(JSON_EXTRACT(categories, "$[0]"))')],
            raw: true
        });

        // Recent activity
        const recentActivity = await PoolReport.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            }
        });

        // Resolution time statistics
        const resolutionStats = await PoolReport.findAll({
            attributes: [
                [sequelize.fn('AVG', sequelize.literal('TIMESTAMPDIFF(HOUR, createdAt, resolvedAt)')), 'avgResolutionHours'],
                [sequelize.fn('MAX', sequelize.literal('TIMESTAMPDIFF(HOUR, createdAt, resolvedAt)')), 'maxResolutionHours'],
                [sequelize.fn('MIN', sequelize.literal('TIMESTAMPDIFF(HOUR, createdAt, resolvedAt)')), 'minResolutionHours']
            ],
            where: {
                ...dateFilter,
                status: 'resolved',
                resolvedAt: { [Op.ne]: null }
            },
            raw: true
        });

        return {
            overview: {
                totalReports: statusStats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
                recentActivity,
                ...resolutionStats[0]
            },
            byStatus: statusStats,
            bySeverity: severityStats,
            byCategory: categoryStats.filter(stat => stat.category), // Remove null categories
            timeRange
        };
    } catch (error) {
        console.error('Error in getReportStatistics:', error);
        throw new Error(`Failed to get report statistics: ${error.message}`);
    }
}

async function getTopReportedPools(limit = 10) {
    try {
        const topReportedPools = await PoolReport.findAll({
            attributes: [
                'poolId',
                [sequelize.fn('COUNT', sequelize.col('PoolReport.id')), 'reportCount']
            ],
            include: [{
                model: Pools,
                as: 'pool',
                attributes: ['id', 'name', 'status', 'ownerID', 'total_contributed'],
                required: true
            }],
            group: ['poolId'],
            order: [[sequelize.literal('reportCount'), 'DESC']],
            limit: parseInt(limit),
            raw: true
        });

        return topReportedPools;
    } catch (error) {
        console.error('Error in getTopReportedPools:', error);
        throw new Error(`Failed to get top reported pools: ${error.message}`);
    }
}

async function getUserReportingHistory(userId) {
    try {
        const userReports = await PoolReport.findAll({
            where: { reporterId: userId },
            attributes: [
                'status',
                'severity',
                'createdAt',
                'resolvedAt'
            ],
            include: [{
                model: Pools,
                as: 'pool',
                attributes: ['id', 'name']
            }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        const stats = await PoolReport.findAll({
            where: { reporterId: userId },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalReports'],
                [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "resolved" THEN 1 ELSE 0 END')), 'resolvedReports'],
                [sequelize.fn('SUM', sequelize.literal('CASE WHEN severity = "critical" THEN 1 ELSE 0 END')), 'criticalReports']
            ],
            raw: true
        });

        return {
            reports: userReports,
            statistics: stats[0]
        };
    } catch (error) {
        console.error('Error in getUserReportingHistory:', error);
        throw new Error(`Failed to get user reporting history: ${error.message}`);
    }
}

async function getAdminDashboardStats() {
    try {
        const [
            totalReports,
            pendingReports,
            criticalReports,
            recentReports,
            topReporters,
            resolutionRate
        ] = await Promise.all([
            PoolReport.count(),
            PoolReport.count({ where: { status: 'pending' } }),
            PoolReport.count({ where: { severity: 'critical', status: ['pending', 'under_review'] } }),
            PoolReport.count({
                where: {
                    createdAt: {
                        [Op.gte]: new Date(new Date() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                }
            }),
            _getTopReporters(5),
            _calculateResolutionRate()
        ]);

        return {
            totalReports,
            pendingReports,
            criticalReports,
            recentReports,
            topReporters,
            resolutionRate: Math.round(resolutionRate * 100) / 100
        };
    } catch (error) {
        console.error('Error in getAdminDashboardStats:', error);
        throw new Error(`Failed to get admin dashboard stats: ${error.message}`);
    }
}



async function _processReportData(report) {
    const baseUrl = process.env.BASE_URL;
    const defaultUserImage = `${baseUrl}/assets/img/user.png`;

    const reportJson = report.toJSON();

    // Process reporter photo if available
    if (reportJson.reporter && reportJson.reporter.photo_id) {
        // You might want to add file lookup logic here similar to your pool service
        reportJson.reporter.photo = defaultUserImage; // Placeholder
    }

    return reportJson;
}

function _calculateReportSeverity(categories) {
    const severityMap = {
        'scam': 'critical',
        'illegal': 'critical',
        'harassment': 'high',
        'privacy': 'high',
        'inappropriate': 'medium',
        'spam': 'low',
        'other': 'medium'
    };

    const highestSeverity = categories.reduce((highest, category) => {
        const currentSeverity = severityMap[category] || 'medium';
        const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return severityOrder[currentSeverity] > severityOrder[highest] ? currentSeverity : highest;
    }, 'low');

    return highestSeverity;
}

async function _handleCriticalReportResolution(report, transaction) {
    // Example: Automatically suspend pool if critical report is resolved
    if (report.categories.includes('scam') || report.categories.includes('illegal')) {
        await Pools.update(
            { status: 0 }, // Suspend pool
            { where: { id: report.poolId }, transaction }
        );

        // You can also add notification logic here
        console.log(`Pool ${report.poolId} suspended due to critical report resolution`);
    }
}

async function _getTopReporters(limit = 5) {
    return await PoolReport.findAll({
        attributes: [
            'reporterId',
            [sequelize.fn('COUNT', sequelize.col('id')), 'reportCount']
        ],
        include: [{
            model: User,
            as: 'reporter',
            attributes: ['id', 'username', 'firstName', 'lastName'],
            required: true
        }],
        group: ['reporterId'],
        order: [[sequelize.literal('reportCount'), 'DESC']],
        limit: parseInt(limit),
        raw: true
    });
}

async function _calculateResolutionRate() {
    const stats = await PoolReport.findAll({
        attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'totalReports'],
            [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "resolved" THEN 1 ELSE 0 END')), 'resolvedReports']
        ],
        raw: true
    });

    const total = parseInt(stats[0].totalReports) || 0;
    const resolved = parseInt(stats[0].resolvedReports) || 0;

    return total > 0 ? (resolved / total) * 100 : 0;
}

async function bulkUpdateReportStatus(reportIds, status, adminNotes = null, resolvedBy = null) {
    const transaction = await sequelize.transaction();

    try {
        const updateData = { status };
        if (adminNotes) updateData.adminNotes = adminNotes;
        if (status === 'resolved' || status === 'dismissed') {
            updateData.resolvedAt = new Date();
            updateData.resolvedBy = resolvedBy;
        }

        const [affectedCount] = await PoolReport.update(updateData, {
            where: {
                id: {
                    [Op.in]: reportIds
                }
            },
            transaction
        });

        await transaction.commit();
        return affectedCount;
    } catch (error) {
        await transaction.rollback();
        console.error('Error in bulkUpdateReportStatus:', error);
        throw new Error(`Failed to bulk update report status: ${error.message}`);
    }
}


module.exports = {
    submitReport,
    getReportById,
    updateReportStatus,
    deleteReport,
    getReportsByPool,
    getReportsByUser,
    getAllReports,
    getReportStatistics,
    getTopReportedPools,
    getUserReportingHistory,
    getAdminDashboardStats,
    bulkUpdateReportStatus
}