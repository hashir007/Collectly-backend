const { Op } = require("sequelize");
const { sequelize } = require('../models/index.js');
const moment = require('moment');

const {
    Pools,
    PoolsMembers,
    PoolsPayments,
    User,
    PoolsMessages,
    PoolsEvents,
    PoolsEventTips,
    PoolJoinRequests,
    UserSocialMediaLinks
} = require('../models/index.js');

async function isPoolAdminOrOwner(memberID, pool) {
    if (!memberID || !pool) return false;
    if (pool.ownerId === memberID) return true;
    const membership = await PoolsMembers.findOne({ where: { poolID: pool.id, memberID: memberID } });
    return membership && (membership.role === 'admin' || membership.role === 'owner');
}

module.exports = {

    async getPoolMemberDetails(poolID, memberId, currentUserId = null) {
        try {
            const pId = parseInt(poolID, 10);
            const mId = parseInt(memberId, 10);
            if (Number.isNaN(pId) || Number.isNaN(mId)) {
                const err = new Error('Invalid poolID or memberId');
                err.code = 'INVALID_IDS';
                throw err;
            }

            const pool = await Pools.findByPk(pId);
            if (!pool) {
                const err = new Error('Pool not found');
                err.code = 'POOL_NOT_FOUND';
                throw err;
            }

            // Get member with photo handling like findUserByIdV1
            const member = await User.findOne({
                attributes: [
                    'id',
                    'firstName',
                    'lastName',
                    'username',
                    'email',
                    'phone',
                    'photo_id',
                    [
                        sequelize.literal(`(
                        SELECT f.name
                        FROM user u
                        LEFT JOIN files f ON u.photo_id = f.id
                        WHERE f.name IS NOT NULL
                        AND u.id = User.id
                    )`),
                        'photo'
                    ]
                ],
                where: { id: mId }
            });

            if (!member) {
                const err = new Error('User not found');
                err.code = 'USER_NOT_FOUND';
                throw err;
            }

            // Generate photo URL like in findUserByIdV1
            const photoName = member.getDataValue('photo');
            const photoUrl = photoName
                ? `${process.env.BASE_URL}/public/user/${member.id}/${photoName}`
                : `${process.env.BASE_URL}/assets/img/user.png`;

            // Get social media links
            const socialMediaLinks = await UserSocialMediaLinks.findAll({
                where: { createdBy: mId },
                attributes: ['id', 'link', 'social_media', 'createdAt'],
                order: [['createdAt', 'DESC']]
            });

            // Format social media links
            const formattedSocialLinks = socialMediaLinks.map(link => ({
                id: link.id,
                platform: link.social_media,
                url: link.link,
                addedAt: link.createdAt
            }));

            const membership = await PoolsMembers.findOne({
                where: { poolID: pId, memberID: mId }
            });
            if (!membership) {
                const err = new Error('Membership not found');
                err.code = 'MEMBERSHIP_NOT_FOUND';
                throw err;
            }

            // Get member contributions summary
            const contributions = await PoolsPayments.findAll({
                where: { poolID: pId, memberID: mId, status: 'completed' },
                attributes: [
                    [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalContributed'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'contributionCount']
                ],
                raw: true
            });

            const totalContributed = parseFloat(contributions[0]?.totalContributed || 0);
            const contributionCount = parseInt(contributions[0]?.contributionCount || 0, 10);

            // Calculate days in pool
            const joinedAt = membership.createdAt;
            const daysInPool = Math.floor((new Date() - new Date(joinedAt)) / (1000 * 60 * 60 * 24));

            // Get pool total for contribution percentage
            const poolTotalResult = await PoolsPayments.findAll({
                where: { poolID: pId, status: 'completed' },
                attributes: [
                    [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'poolTotal']
                ],
                raw: true
            });

            const poolTotal = parseFloat(poolTotalResult[0]?.poolTotal || 0);
            const contributionPercentage = poolTotal > 0 ? (totalContributed / poolTotal) * 100 : 0;

            // Get member rank in pool (based on contributions)
            const memberRanks = await PoolsPayments.findAll({
                where: { poolID: pId, status: 'completed' },
                attributes: [
                    'memberID',
                    [sequelize.fn('SUM', sequelize.col('amount')), 'totalContributed']
                ],
                group: ['memberID'],
                order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
                raw: true
            });

            let rank = 'N/A';
            const memberIndex = memberRanks.findIndex(m => m.memberID === mId);
            if (memberIndex !== -1) {
                rank = memberIndex + 1;
            }

            // FIX: Check if current user (not the member being viewed) can manage this member
            let canManage = false;
            if (currentUserId) {
                const currentUserMembership = await PoolsMembers.findOne({
                    where: { poolID: pId, memberID: currentUserId }
                });
                canManage = currentUserMembership?.role === 'admin';
            }

            return {
                member: {
                    // Basic member info
                    id: member.id,
                    email: member.email,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    username: member.username,
                    photo: photoUrl,
                    phone: member.phone,

                    // Membership info
                    role: membership.role,
                    joinedAt: membership.createdAt,

                    // Contribution stats
                    totalContributed,
                    contributionCount,
                    daysInPool,
                    contributionPercentage: Math.round(contributionPercentage * 100) / 100,
                    rank,
                    poolTotal,

                    // Social media links
                    socialMediaLinks: formattedSocialLinks,

                    // Permissions
                    canManage
                }
            };
        } catch (err) {            
            throw err;
        }
    },

    async updateMemberRole(poolID, memberId, newRole, performedBy) {
        const transaction = await sequelize.transaction();
        try {
            const pId = parseInt(poolID, 10);
            const mId = parseInt(memberId, 10);
            const actorId = parseInt(performedBy, 10);

            if (Number.isNaN(pId) || Number.isNaN(mId) || Number.isNaN(actorId)) {
                const err = new Error('Invalid IDs provided');
                err.code = 'INVALID_IDS';
                throw err;
            }
            if (!newRole || typeof newRole !== 'string') {
                const err = new Error('Invalid newRole provided');
                err.code = 'INVALID_ROLE';
                throw err;
            }

            const pool = await Pools.findByPk(pId, { transaction });
            if (!pool) {
                const err = new Error('Pool not found');
                err.code = 'POOL_NOT_FOUND';
                throw err;
            }

            const allowed = await isPoolAdminOrOwner(actorId, pool);
            if (!allowed) {
                const err = new Error('Unauthorized');
                err.code = 'UNAUTHORIZED';
                throw err;
            }

            const membership = await PoolsMembers.findOne({ where: { poolID: pId, memberID: mId }, transaction });
            if (!membership) {
                const err = new Error('Membership not found');
                err.code = 'MEMBERSHIP_NOT_FOUND';
                throw err;
            }

            if (membership.role === 'owner') {
                const err = new Error('Cannot change role of pool owner');
                err.code = 'CANNOT_CHANGE_OWNER';
                throw err;
            }
            if (newRole === 'owner') {
                const err = new Error('Assigning owner role is not allowed via this operation');
                err.code = 'INVALID_ROLE_CHANGE';
                throw err;
            }

            const previousRole = membership.role;
            membership.role = newRole;
            await membership.save({ transaction });

            // Minimal audit: create a PoolsMessages entry or a permissions log if you have one.
            // If you have a dedicated audit table add an entry there. For now we log.


            await transaction.commit();
            return membership;
        } catch (err) {
            await transaction.rollback().catch(rbErr => {

            });

            throw err;
        }
    },

    async removeMemberFromPool(poolID, memberId, performedBy) {
        const transaction = await sequelize.transaction();
        try {
            const pId = parseInt(poolID, 10);
            const mId = parseInt(memberId, 10);
            const actorId = parseInt(performedBy, 10);

            if (Number.isNaN(pId) || Number.isNaN(mId) || Number.isNaN(actorId)) {
                const err = new Error('Invalid IDs provided');
                err.code = 'INVALID_IDS';
                throw err;
            }

            const pool = await Pools.findByPk(pId, { transaction });
            if (!pool) {
                const err = new Error('Pool not found');
                err.code = 'POOL_NOT_FOUND';
                throw err;
            }

            const allowed = await isPoolAdminOrOwner(actorId, pool);
            if (!allowed) {
                const err = new Error('Unauthorized');
                err.code = 'UNAUTHORIZED';
                throw err;
            }

            const membership = await PoolsMembers.findOne({ where: { poolID: pId, memberID: mId }, transaction });
            if (!membership) {
                const err = new Error('Membership not found');
                err.code = 'MEMBERSHIP_NOT_FOUND';
                throw err;
            }

            if (membership.role === 'owner') {
                const err = new Error('Cannot remove pool owner');
                err.code = 'CANNOT_REMOVE_OWNER';
                throw err;
            }

            const snapshot = membership.toJSON();
            await membership.destroy({ transaction });



            await transaction.commit();
            return { removed: true, membershipSnapshot: snapshot };
        } catch (err) {
            await transaction.rollback().catch(rbErr => {

            });

            throw err;
        }
    },

    async getMemberContributions(poolID, memberId, options = {}) {
        try {
            const pId = parseInt(poolID, 10);
            const mId = parseInt(memberId, 10);
            if (Number.isNaN(pId) || Number.isNaN(mId)) {
                const err = new Error('Invalid IDs provided');
                err.code = 'INVALID_IDS';
                throw err;
            }

            const { limit = 50, offset = 0, fromDate, toDate, aggregate = false } = options;
            const where = { poolID: pId, memberID: mId };

            if (fromDate || toDate) {
                where.createdAt = {};
                if (fromDate) where.createdAt[Op.gte] = moment(fromDate).toDate();
                if (toDate) where.createdAt[Op.lte] = moment(toDate).toDate();
            }

            const payments = await PoolsPayments.findAll({
                where,
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            // Format payments for response
            const formattedPayments = payments.map(payment => ({
                id: payment.id,
                amount: payment.amount,
                type: payment.type,
                status: payment.status,
                transactionId: payment.transactionId,
                date: payment.createdAt,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt
            }));

            if (!aggregate) {
                return {
                    contributions: formattedPayments,
                    summary: {
                        totalCount: formattedPayments.length
                    },
                    pagination: {
                        limit,
                        offset,
                        total: formattedPayments.length
                    }
                };
            }

            const totals = await PoolsPayments.findAll({
                where,
                attributes: [
                    [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalAmount'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                raw: true
            });

            const totalAmount = parseFloat(totals[0].totalAmount || 0);
            const totalCount = parseInt(totals[0].count || 0, 10);

            return {
                contributions: formattedPayments,
                summary: {
                    totalAmount,
                    totalCount,
                    averageAmount: totalCount > 0 ? totalAmount / totalCount : 0
                },
                pagination: {
                    limit,
                    offset,
                    total: totalCount
                }
            };
        } catch (err) {
            logger.error(`getMemberContributions service error: ${err.message}`, { stack: err.stack });
            throw err;
        }
    },

    async getMemberActivity(poolID, memberId, options = {}) {
        try {
            const pId = parseInt(poolID, 10);
            const mId = parseInt(memberId, 10);
            if (Number.isNaN(pId) || Number.isNaN(mId)) {
                const err = new Error('Invalid IDs provided');
                err.code = 'INVALID_IDS';
                throw err;
            }

            const { limit = 50, offset = 0, types } = options;
            const requestedTypes = Array.isArray(types) ? types : (typeof types === 'string' ? types.split(',').map(t => t.trim()).filter(Boolean) : null);

            // Fetch each source in parallel
            const [
                joinRequests,
                payments
            ] = await Promise.all([
                PoolJoinRequests.findAll({
                    where: { poolID: pId, userId: mId },
                    attributes: ['id', 'poolID', 'userId', 'status', 'referral_code', 'createdAt'],
                    order: [['createdAt', 'DESC']],
                    limit: limit + offset
                }),
                PoolsPayments.findAll({
                    where: { poolID: pId, memberID: mId },
                    attributes: ['id', 'poolID', 'memberID', 'amount', 'source', 'status', 'createdAt'],
                    order: [['createdAt', 'DESC']],
                    limit: limit + offset
                })
            ]);

            // Map each source into a uniform activity shape
            const mapped = [];

            joinRequests.forEach(jr => {
                mapped.push({
                    id: `joinRequest:${jr.id}`,
                    type: 'join_request',
                    title: this.getActivityTitle('join_request', jr.status),
                    description: this.getActivityDescription('join_request', jr),
                    icon: 'bi-person-plus',
                    timestamp: jr.createdAt,
                    amount: null,
                    status: jr.status
                });
            });

            payments.forEach(p => {
                mapped.push({
                    id: `payment:${p.id}`,
                    type: 'payment',
                    title: this.getActivityTitle('payment', p.status),
                    description: this.getActivityDescription('payment', p),
                    icon: 'bi-cash-coin',
                    timestamp: p.createdAt,
                    amount: p.amount,
                    status: p.status
                });
            });

            // Optionally filter by requestedTypes
            let filtered = mapped;
            if (requestedTypes && requestedTypes.length) {
                filtered = mapped.filter(a => requestedTypes.includes(a.type));
            }

            // Sort by createdAt desc and apply offset/limit
            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const totalCount = filtered.length;
            const paged = filtered.slice(offset, offset + limit);

            return {
                activities: paged,
                pagination: {
                    limit,
                    offset,
                    total: totalCount,
                    hasMore: offset + limit < totalCount
                }
            };
        } catch (err) {
            logger.error(`getMemberActivity service error: ${err.message}`, { stack: err.stack });
            throw err;
        }
    },

    getActivityTitle(activityType, status) {
        const titles = {
            join_request: {
                pending: 'Join Request Submitted',
                approved: 'Join Request Approved',
                rejected: 'Join Request Rejected'
            },
            payment: {
                pending: 'Payment Initiated',
                completed: 'Payment Completed',
                failed: 'Payment Failed'
            }
        };
        return titles[activityType]?.[status] || 'Activity';
    },

    getActivityDescription(activityType, data) {
        switch (activityType) {
            case 'join_request':
                return `Request to join pool ${data.poolID}`;
            case 'payment':
                return `Payment of $${data.amount} ${data.status === 'completed' ? 'was successful' : data.status}`;
            default:
                return 'Member activity';
        }
    },
    sanitizeMember(member) {
        if (!member) return null;
        return {
            id: member.id,
            email: member.email,
            firstName: member.firstName,
            lastName: member.lastName,
            username: member.username
        };
    },
    sanitizeMembership(membership) {
        if (!membership) return null;
        // Expose only safe membership fields
        return {
            id: membership.id,
            poolId: membership.poolId,
            userId: membership.userId,
            role: membership.role,
            joinedAt: membership.createdAt
        };
    }
};