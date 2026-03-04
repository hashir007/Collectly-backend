const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const { PoolPayouts, PoolPayoutTransactions, Pools, User, PoolsMembers, PoolPayoutVotes, PoolVotingSettings, Files, PoolPayoutApprovals } = require('../models/index.js');
const { checkVotingThreshold } = require('./poolPayoutVoting.service');

const ALLOWED_TRANSACTION_TYPES = ['debit', 'credit'];



// Get all payouts for a Pool with pagination and filters
async function getPoolPayouts(poolId, options = {}) {
    const {
        page = 1,
        limit = 10,
        status,
        voting_status,
        search
    } = options;

    const offset = (page - 1) * limit;

    const where = { poolID: poolId };
    if (status) where.status = status;
    if (voting_status) where.voting_status = voting_status;

    // Search in recipient name or description
    if (search) {
        where[Op.or] = [
            { '$recipient.username$': { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } }
        ];
    }

    // ✅ CRITICAL: Check and update expired voting BEFORE fetching
    try {
        await checkAndUpdateExpiredVoting(poolId);
    } catch (error) {
        // Don't fail the payout fetch if voting check fails
        console.warn('Voting threshold check failed:', error.message);
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const defaultUserImage = `${baseUrl}/assets/img/user.png`;
    const recipientPhotoSubquery = '(SELECT name FROM files WHERE id = recipient.photo_id)';
    const creatorPhotoSubquery = '(SELECT name FROM files WHERE id = creator.photo_id)';

    const poolVotingSettings = await PoolVotingSettings.findOne({
        where: { poolID: poolId }
    });

    const isPoolVotingEnabled = poolVotingSettings?.voting_enabled || false;

    try {
        const { count, rows } = await PoolPayouts.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'recipient',
                    attributes: ['id', 'username', 'email', 'photo_id', [sequelize.literal(recipientPhotoSubquery), 'photo'],]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email', 'photo_id', [sequelize.literal(creatorPhotoSubquery), 'photo']]
                },
                {
                    model: PoolPayoutVotes,
                    as: 'votes',
                    attributes: ['vote_type'],
                    include: [{
                        model: User,
                        as: 'voter',
                        attributes: ['id', 'username']
                    }]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        // Process photo URLs after fetching
        const processedPayouts = rows.map(payout => {
            const payoutData = payout.toJSON();


            if (!isPoolVotingEnabled && payoutData.voting_enabled) {
                payoutData.voting_enabled = false;
                payoutData.voting_status = 'disabled_by_pool';
                payoutData.voting_disabled_reason = 'Pool voting system is disabled';
            }


            // Process recipient photo
            if (payoutData.recipient) {
                payoutData.recipient.photo = payoutData.recipient.photo_id
                    ? `${baseUrl}/public/user/${payoutData.recipient.id}/${payoutData.recipient.photo}`
                    : defaultUserImage;
            }

            // Process creator photo
            if (payoutData.creator) {
                payoutData.creator.photo = payoutData.creator.photo_id
                    ? `${baseUrl}/public/user/${payoutData.creator.id}/${payoutData.creator.photo}`
                    : defaultUserImage;
            }

            return payoutData;
        });

        return {
            payouts: processedPayouts,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    } catch (error) {
        throw new Error(`Failed to fetch payouts: ${error.message}`);
    }
}

// Get PoolPayout by ID with full details
async function getPayoutById(payoutId) {
    try {
        // ✅ CRITICAL: First check if this payout needs voting update
        const payoutInfo = await PoolPayouts.findOne({
            where: { id: payoutId },
            attributes: ['id', 'poolID']
        });

        if (payoutInfo && payoutInfo.poolID) {
            try {
                await checkAndUpdateExpiredVoting(payoutInfo.poolID);
            } catch (error) {
                console.warn('⚠️ Voting check failed for single payout:', error.message);
                // Continue anyway - don't fail the request
            }
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const defaultUserImage = `${baseUrl}/assets/img/user.png`;
        const recipientPhotoSubquery = '(SELECT name FROM files WHERE id = recipient.photo_id)';
        const creatorPhotoSubquery = '(SELECT name FROM files WHERE id = creator.photo_id)';

        // Now fetch the payout with all relationships
        const poolPayout = await PoolPayouts.findOne({
            where: { id: payoutId },
            include: [
                {
                    model: User,
                    as: 'recipient',
                    attributes: ['id', 'username', 'email', 'photo_id', [sequelize.literal(recipientPhotoSubquery), 'photo']]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email', 'photo_id', [sequelize.literal(creatorPhotoSubquery), 'photo']]
                },
                {
                    model: Pools,
                    as: 'pool',
                    attributes: ['id', 'name', 'total_contributed', 'goal_amount', 'ownerID']
                },
                {
                    model: PoolPayoutTransactions,
                    as: 'payoutTransactions',
                    order: [['createdAt', 'DESC']]
                },
                {
                    model: PoolPayoutVotes,
                    as: 'votes',
                    include: [{
                        model: User,
                        as: 'voter',
                        attributes: ['id', 'username']
                    }]
                }
            ]
        });

        if (!poolPayout) {
            throw new Error('PoolPayout not found');
        }

        let votingSettings = null;
        if (poolPayout.poolID) {
            votingSettings = await PoolVotingSettings.findOne({
                where: { poolID: poolPayout.poolID }
            });
        }

        const payoutData = poolPayout.toJSON();

        payoutData.votingSettings = votingSettings ? votingSettings.toJSON() : null;

        // Process photo URLs
        if (payoutData.recipient) {
            payoutData.recipient.photo = payoutData.recipient.photo_id
                ? `${baseUrl}/public/user/${payoutData.recipient.id}/${payoutData.recipient.photo}`
                : defaultUserImage;
        }

        if (payoutData.creator) {
            payoutData.creator.photo = payoutData.creator.photo_id
                ? `${baseUrl}/public/user/${payoutData.creator.id}/${payoutData.creator.photo}`
                : defaultUserImage;
        }

        // Process voter photos
        if (payoutData.votes && Array.isArray(payoutData.votes)) {
            payoutData.votes = payoutData.votes.map(vote => {
                if (vote.voter) {
                    vote.voter.photo = vote.voter.photo_id
                        ? `${baseUrl}/public/user/${vote.voter.id}/${vote.voter.photo}`
                        : defaultUserImage;
                }
                return vote;
            });
        }

        // Add real-time voting status check
        if (payoutData.voting_enabled &&
            payoutData.voting_status === 'active' &&
            payoutData.voting_ends_at) {

            const now = new Date();
            const endsAt = new Date(payoutData.voting_ends_at);

            if (now > endsAt) {
                // Voting has expired locally
                payoutData.voting_has_expired_locally = true;
                payoutData.voting_status_local = 'completed';
            }
        }

        return payoutData;

    } catch (error) {
        console.error('Error in getPayoutById:', error);
        throw new Error(`Failed to fetch PoolPayout: ${error.message}`);
    }
}

// Add this function to poolPayoutVoting.service.js
async function checkAndUpdateExpiredVoting(poolId = null) {
    const transaction = await sequelize.transaction();

    try {
        const now = new Date();

        // Find payouts with active voting that have expired
        const where = {
            voting_enabled: true,
            voting_status: 'active',
            voting_ends_at: {
                [Op.lt]: now
            },
            status: 'pending_voting'
        };

        if (poolId) {
            where.poolID = poolId;
        }

        const expiredPayouts = await PoolPayouts.findAll({
            where,
            transaction,
            lock: transaction.LOCK.UPDATE,
            skipLocked: true,
            limit: 20 // Process max 20 at a time
        });

        if (expiredPayouts.length === 0) {
            await transaction.commit();
            return { updated: 0 };
        }

        const updatedPayouts = [];

        for (const payout of expiredPayouts) {
            try {
                // ✅ CORRECT: Get voting settings separately
                const votingSettings = await PoolVotingSettings.findOne({
                    where: { poolID: payout.poolID },
                    transaction
                });

                if (votingSettings) {
                    // Call your existing checkVotingThreshold function
                    await checkVotingThreshold(payout, votingSettings, transaction);
                } else {
                    // No voting settings - just mark as completed
                    await PoolPayouts.update({
                        voting_status: 'completed',
                        voting_result: 'failed',
                        failure_reason: 'Voting expired - no voting settings found',
                        updatedAt: new Date()
                    }, {
                        where: { id: payout.id },
                        transaction
                    });
                }

                updatedPayouts.push(payout.id);
                console.log(`✅ Voting finalized for payout ${payout.id}`);

            } catch (error) {
                console.error(`❌ Failed to update expired voting for payout ${payout.id}:`, error);
                // Continue with other payouts
            }
        }

        await transaction.commit();
        return {
            updated: updatedPayouts.length,
            payouts: updatedPayouts
        };

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error in checkAndUpdateExpiredVoting:', error);
        return { updated: 0, error: error.message };
    }
}

// Create new PoolPayout
async function createPayout(payoutData) {
    const transaction = await sequelize.transaction();

    try {
        const { poolID, recipientId, amount, description, created_by, enable_voting = false } = payoutData;

        // Validate Pool exists and has sufficient balance
        const pool = await Pools.findOne({
            where: { id: poolID },
            transaction
        });

        if (!pool) {
            throw new Error('Pool not found');
        }

        if (parseFloat(amount) > parseFloat(pool.total_contributed || 0)) {
            throw new Error('Payout amount exceeds Pool balance');
        }

        // Validate recipient is a Pool member
        const poolMember = await PoolsMembers.findOne({
            where: {
                poolID: poolID,
                memberID: recipientId
            },
            include: [{
                model: User,
                as: 'member'
            }],
            transaction
        });

        if (!poolMember) {
            throw new Error('Recipient is not an active Pool member');
        }

        // Check if recipient has sufficient contribution balance
        if (parseFloat(amount) > parseFloat(poolMember.total_contributed || 0)) {
            throw new Error('Payout amount exceeds recipient available balance');
        }

        // Get voting settings if voting is enabled
        let votingSettings = null;
        if (enable_voting) {
            votingSettings = await PoolVotingSettings.findOne({
                where: { poolID: poolID },
                transaction
            });

            if (!votingSettings || !votingSettings.voting_enabled) {
                throw new Error('Voting is not enabled for this Pool');
            }
        }

        // Create PoolPayout
        const poolPayout = await PoolPayouts.create({
            poolID,
            recipientId,
            amount: parseFloat(amount),
            description,
            createdby: created_by,
            voting_enabled: enable_voting,
            voting_status: enable_voting ? 'active' : 'not_started',
            voting_starts_at: enable_voting ? new Date() : null,
            voting_ends_at: enable_voting ?
                new Date(Date.now() + ((votingSettings?.voting_duration || 72) * 60 * 60 * 1000)) : null,
            status: enable_voting ? 'pending_voting' : 'pending'
        }, { transaction });

        // Create transaction record
        await PoolPayoutTransactions.create({
            payoutId: poolPayout.id,
            transaction_type: 'debit',
            amount: parseFloat(amount),
            balance_before: pool.total_contributed,
            balance_after: parseFloat(pool.total_contributed) - parseFloat(amount),
            description: `Payout initiated to ${poolMember.member?.username || 'recipient'}`
        }, { transaction });

        // Update pool balance
        await Pools.update({
            total_contributed: parseFloat(pool.total_contributed) - parseFloat(amount)
        }, {
            where: { id: poolID },
            transaction
        });

        // Update member contribution balance
        await PoolsMembers.update({
            total_contributed: parseFloat(poolMember.total_contributed) - parseFloat(amount)
        }, {
            where: {
                poolID: poolID,
                memberID: recipientId
            },
            transaction
        });

        await transaction.commit();

        // Return Payout with relationships
        return await getPayoutById(poolPayout.id);

    } catch (error) {
        await transaction.rollback();
        throw new Error(`Failed to create Payout: ${error.message}`);
    }
}

// Update Payout status - FIXED VOTING LOGIC
async function updatePayoutStatus(payoutId, status, failureReason = null) {
    const transaction = await sequelize.transaction();

    try {
        const poolPayout = await PoolPayouts.findOne({
            where: { id: payoutId },
            include: [{
                model: Pools,
                as: 'pool'
            }],
            transaction
        });

        if (!poolPayout) {
            await transaction.rollback();
            throw new Error('Payout not found');
        }

        // Check voting requirements for completion
        if (status === 'completed' && poolPayout.voting_enabled) {
            // ✅ CORRECT: Check if voting period has ended
            if (poolPayout.voting_ends_at && new Date() < new Date(poolPayout.voting_ends_at)) {
                await transaction.rollback();
                throw new Error('Cannot complete payout - voting period has not ended yet');
            }

            // ✅ CORRECT: Check voting status is completed
            if (poolPayout.voting_status !== 'completed') {
                await transaction.rollback();
                throw new Error(`Cannot complete payout - voting is ${poolPayout.voting_status}`);
            }

            // ✅ CORRECT: Check voting result is approved
            if (poolPayout.voting_result !== 'approved') {
                await transaction.rollback();
                throw new Error(`Cannot complete payout - voting result is "${poolPayout.voting_result}"`);
            }
        }

        const previousStatus = poolPayout.status;

        // Prepare update data - FIXED FIELD NAME
        const updateData = {
            status,
            updatedAt: new Date()  // ✅ FIXED: Should be updatedAt (camelCase)
        };

        if (failureReason) updateData.failure_reason = failureReason;
        if (status === 'completed') updateData.completed_at = new Date();
        if (status === 'failed') updateData.failed_at = new Date();
        if (status === 'cancelled') updateData.cancelled_at = new Date();

        // Update payout
        await poolPayout.update(updateData, { transaction });

        // Handle balance updates
        let transactionType = null;
        let txnAmount = 0;

        if (status === 'completed') {
            transactionType = 'debit';
            txnAmount = poolPayout.amount || 0;

            // Update pool balance
            if (poolPayout.pool) {
                const newBalance = parseFloat(poolPayout.pool.total_contributed || 0) - txnAmount;
                await Pools.update({
                    total_contributed: newBalance
                }, {
                    where: { id: poolPayout.poolID },
                    transaction
                });
            }
        } else if (status === 'cancelled') {
            transactionType = 'credit';
            txnAmount = poolPayout.amount || 0;

            // Update pool balance
            if (poolPayout.pool) {
                const newBalance = parseFloat(poolPayout.pool.total_contributed || 0) + txnAmount;
                await Pools.update({
                    total_contributed: newBalance
                }, {
                    where: { id: poolPayout.poolID },
                    transaction
                });
            }
        }

        // Create transaction record
        if (transactionType && poolPayout.pool) {
            const balanceBefore = parseFloat(poolPayout.pool.total_contributed || 0);
            const balanceAfter = transactionType === 'debit'
                ? balanceBefore - txnAmount
                : balanceBefore + txnAmount;

            await PoolPayoutTransactions.create({
                payoutId: payoutId,
                transaction_type: transactionType,
                amount: txnAmount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                description: `Payout ${status}${failureReason ? `: ${failureReason}` : ''}`
            }, { transaction });
        }

        await transaction.commit();

        // Return updated payout
        return await getPayoutById(payoutId);

    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error('Failed to update payout status:', error);
        throw new Error(`Failed to update Payout status: ${error.message}`);
    }
}

// Cancel Payout
async function cancelPayout(payoutId, reason = 'Cancelled by user') {
    const transaction = await sequelize.transaction();

    try {
        const poolPayout = await PoolPayouts.findOne({
            where: { id: payoutId },
            transaction
        });

        if (!poolPayout) {
            throw new Error('Payout not found');
        }

        if (poolPayout.status === 'completed') {
            throw new Error('Cannot cancel completed Payout');
        }

        // Return funds to Pool and member
        const pool = await Pools.findOne({
            where: { id: poolPayout.poolID },
            transaction
        });

        const poolMember = await PoolsMembers.findOne({
            where: {
                poolID: poolPayout.poolID,
                memberID: poolPayout.recipientId
            },
            transaction
        });

        if (pool) {
            // Update Pool balance
            await Pools.update({
                total_contributed: parseFloat(pool.total_contributed) + parseFloat(poolPayout.amount)
            }, {
                where: { id: poolPayout.poolID },
                transaction
            });
        }

        if (poolMember) {
            // Update member contribution balance
            await PoolsMembers.update({
                total_contributed: parseFloat(poolMember.total_contributed) + parseFloat(poolPayout.amount)
            }, {
                where: {
                    poolID: poolPayout.poolID,
                    memberID: poolPayout.recipientId
                },
                transaction
            });
        }

        // Update Payout status
        await PoolPayouts.update({
            status: 'cancelled',
            failure_reason: reason,
            voting_status: 'cancelled'
        }, {
            where: { id: payoutId },
            transaction
        });

        // Create transaction record
        await PoolPayoutTransactions.create({
            payoutId: payoutId,
            transaction_type: 'credit',
            amount: poolPayout.amount,
            balance_before: parseFloat(pool?.total_contributed || 0) - parseFloat(poolPayout.amount),
            balance_after: pool?.total_contributed || 0,
            description: `Payout cancelled: ${reason}`
        }, { transaction });

        await transaction.commit();
        return await getPayoutById(payoutId);

    } catch (error) {
        await transaction.rollback();
        throw new Error(`Failed to cancel Payout: ${error.message}`);
    }
}

// Get Payout statistics
async function getPayoutStats(poolId) {
    try {
        const stats = await PoolPayouts.findAll({
            where: { poolID: poolId },
            attributes: [
                'status',
                [sequelize.fn('COUNT', '*'), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
            ],
            group: ['status']
        });

        const votingStats = await PoolPayouts.findAll({
            where: { poolID: poolId, voting_enabled: true },
            attributes: [
                'voting_status',
                [sequelize.fn('COUNT', '*'), 'count']
            ],
            group: ['voting_status']
        });

        const totalPayouts = await PoolPayouts.sum('amount', {
            where: { poolID: poolId }
        }) || 0;

        const completedPayouts = await PoolPayouts.sum('amount', {
            where: { poolID: poolId, status: 'completed' }
        }) || 0;

        const pendingVotingPayouts = await PoolPayouts.sum('amount', {
            where: { poolID: poolId, voting_status: 'active' }
        }) || 0;

        return {
            byStatus: stats,
            byVotingStatus: votingStats,
            totalPayouts,
            completedPayouts,
            pendingVotingPayouts,
            successRate: totalPayouts > 0 ? (completedPayouts / totalPayouts) * 100 : 0
        };
    } catch (error) {
        throw new Error(`Failed to fetch Payout statistics: ${error.message}`);
    }
}

// Get eligible members for Payout
async function getEligibleMembers(poolId) {
    try {
        const poolMembers = await PoolsMembers.findAll({
            where: {
                poolID: poolId
            },
            include: [{
                model: User,
                as: 'member',
                attributes: ['id', 'username', 'email', 'photo_id']
            }]
        });

        return poolMembers
            .filter(member => parseFloat(member.total_contributed || 0) > 0)
            .map(member => ({
                id: member.member.id,
                username: member.member.username,
                email: member.member.email,
                photo: member.member.photo_id,
                availableBalance: parseFloat(member.total_contributed || 0)
            }));
    } catch (error) {
        throw new Error(`Failed to fetch eligible members: ${error.message}`);
    }
}


module.exports = {
    getPoolPayouts,
    getPayoutById,
    createPayout,
    updatePayoutStatus,
    cancelPayout,
    getPayoutStats,
    getEligibleMembers
};