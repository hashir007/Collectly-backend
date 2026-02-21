const { Op } = require("sequelize");
const { sequelize } = require('../models/index.js');
const { PoolPayouts, PoolPayoutVotes, PoolsMembers, User, PoolVotingSettings, Pools } = require('../models/index.js');


// Optional: Add validation for extreme values
function calculateVotingPower(poolsMember, votingType) {
    if (!poolsMember) return 1;

    let votingPower;

    switch (votingType) {
        case 'one_member_one_vote':
            votingPower = 1;
            break;

        case 'weighted_by_contribution':
            votingPower = parseFloat(poolsMember.total_contributed) || 0;
            // Cap extreme contributions if needed
            if (votingPower > 1000000) votingPower = 1000000;
            break;

        case 'weighted_by_shares':
            votingPower = poolsMember.share_count || poolsMember.shares || 0;
            break;

        case 'weighted_by_tenure':
            const joinDate = new Date(poolsMember.joined_at || poolsMember.createdAt);
            const now = new Date();
            const monthsInPool = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24 * 30));
            votingPower = Math.max(1, Math.min(monthsInPool, 120)); // Cap at 10 years
            break;

        case 'tier_based':
            const tier = poolsMember.membership_tier || poolsMember.tier || 'basic';
            const tierWeights = {
                'basic': 1,
                'silver': 2,
                'gold': 3,
                'platinum': 5,
                'admin': 10
            };
            votingPower = tierWeights[tier] || 1;
            break;

        default:
            votingPower = 1;
    }

    // Ensure minimum voting power of 1
    return Math.max(1, votingPower);
}

// Update vote counts in PoolPayout
async function updateVoteCounts(poolPayout, oldVoteType, newVoteType, votingPower, transaction) {
    const updateData = {};

    // Remove old vote counts
    if (oldVoteType) {
        updateData[`${oldVoteType}_votes`] = sequelize.literal(`${oldVoteType}_votes - 1`);
        updateData.total_votes = sequelize.literal('total_votes - 1');
    }

    // Add new vote counts
    updateData[`${newVoteType}_votes`] = sequelize.literal(`${newVoteType}_votes + 1`);
    updateData.total_votes = sequelize.literal('total_votes + 1');

    await PoolPayouts.update(updateData, {
        where: { id: poolPayout.id },
        transaction
    });

    // Recalculate approval percentage based on weighted votes
    const voteStats = await PoolPayoutVotes.findAll({
        where: { payoutId: poolPayout.id },
        attributes: [
            'vote_type',
            [sequelize.fn('SUM', sequelize.col('voting_power')), 'total_power']
        ],
        group: ['vote_type'],
        transaction
    });

    let totalWeightedVotes = 0;
    let approveWeightedVotes = 0;

    voteStats.forEach(stat => {
        const power = parseFloat(stat.dataValues.total_power) || 0;
        totalWeightedVotes += power;
        if (stat.vote_type === 'approve') {
            approveWeightedVotes = power;
        }
    });

    const approvalPercentage = totalWeightedVotes > 0 ?
        (approveWeightedVotes / totalWeightedVotes) * 100 : 0;

    await PoolPayouts.update({
        approval_percentage: approvalPercentage
    }, {
        where: { id: poolPayout.id },
        transaction
    });
}

// Check if voting threshold is met
async function checkVotingThreshold(poolPayout, votingSettings, transaction) {
    if (poolPayout.approval_percentage >= votingSettings.voting_threshold) {
        if (votingSettings.auto_approve) {
            await PoolPayouts.update({
                voting_status: 'completed',
                voting_result: 'approved',
                status: 'processing'
            }, {
                where: { id: poolPayout.id },
                transaction
            });
        } else {
            await PoolPayouts.update({
                voting_status: 'completed',
                voting_result: 'approved'
            }, {
                where: { id: poolPayout.id },
                transaction
            });
        }
    }

    // Check quorum requirement
    if (votingSettings.require_quorum) {
        const totalMembers = await PoolsMembers.count({
            where: {
                poolID: poolPayout.poolID
            },
            transaction
        });

        const participationRate = totalMembers > 0 ? (poolPayout.total_votes / totalMembers) * 100 : 0;
        if (participationRate < votingSettings.quorum_percentage) {
            await PoolPayouts.update({
                voting_status: 'completed',
                voting_result: 'failed',
                failure_reason: `Quorum not met: ${participationRate.toFixed(1)}% participation (required: ${votingSettings.quorum_percentage}%)`
            }, {
                where: { id: poolPayout.id },
                transaction
            });
        }
    }

    // Check if voting period ended
    if (poolPayout.voting_ends_at && new Date() > poolPayout.voting_ends_at) {
        await finalizeVoting(poolPayout, votingSettings, transaction);
    }
}

// Finalize voting when period ends
async function finalizeVoting(poolPayout, votingSettings, transaction) {
    let finalResult = 'rejected';
    let failureReason = 'Voting period ended without reaching approval threshold';

    if (poolPayout.approval_percentage >= votingSettings.voting_threshold) {
        finalResult = 'approved';
        failureReason = null;
    }

    await PoolPayouts.update({
        voting_status: 'completed',
        voting_result: finalResult,
        status: finalResult === 'approved' ? 'processing' : 'failed',
        failure_reason: failureReason
    }, {
        where: { id: poolPayout.id },
        transaction
    });
}

// Cast a vote on a PoolPayout
async function castVote(payoutId, voterId, voteType, comments = '') {
    const transaction = await sequelize.transaction();

    try {
        const poolPayout = await PoolPayouts.findByPk(payoutId, { transaction });
        if (!poolPayout) {
            throw new Error('Payout not found');
        }

        if (!poolPayout.voting_enabled || poolPayout.voting_status !== 'active') {
            throw new Error('Voting is not active for this Payout');
        }

        // Check if voting period has ended
        if (poolPayout.voting_ends_at && new Date() > poolPayout.voting_ends_at) {
            throw new Error('Voting period has ended');
        }

        // Check if user is a pool member
        const poolMember = await PoolsMembers.findOne({
            where: {
                poolID: poolPayout.poolID,
                memberID: voterId
            },
            transaction
        });

        if (!poolMember) {
            throw new Error('Only active pool members can vote');
        }

        // Get voting settings
        const votingSettings = await PoolVotingSettings.findOne({
            where: { poolID: poolPayout.poolID },
            transaction
        });

        if (!votingSettings) {
            throw new Error('Voting settings not found for this pool');
        }

        // Calculate voting power based on voting type
        const votingPower = calculateVotingPower(poolMember, votingSettings.voting_type);

        // Check if user already voted
        const existingVote = await PoolPayoutVotes.findOne({
            where: {
                payoutId: payoutId,
                voterId: voterId
            },
            transaction
        });

        let vote;
        if (existingVote) {
            // Update existing vote
            vote = await existingVote.update({
                vote_type: voteType,
                comments,
                voting_power: votingPower
            }, { transaction });

            // Update vote counts (remove old vote, add new vote)
            await updateVoteCounts(poolPayout, existingVote.vote_type, voteType, votingPower, transaction);
        } else {
            // Create new vote
            vote = await PoolPayoutVotes.create({
                payoutId: payoutId,
                voterId: voterId,
                vote_type: voteType,
                comments,
                voting_power: votingPower
            }, { transaction });

            // Update vote counts
            await updateVoteCounts(poolPayout, null, voteType, votingPower, transaction);
        }

        await transaction.commit();
        return vote;

    } catch (error) {
        await transaction.rollback();
        throw new Error(`Failed to cast vote: ${error.message}`);
    }
}

// Get voting results with detailed analytics
async function getVotingResults(payoutId) {
    try {
        const poolPayout = await PoolPayouts.findOne({
            where: { id: payoutId },
            include: [
                {
                    model: PoolPayoutVotes,
                    as: 'votes',
                    include: [{
                        model: User,
                        as: 'voter',
                        attributes: ['id', 'username', 'photo_id']
                    }]
                },
                {
                    model: Pools,
                    as: 'pool',
                    include: [{
                        model: PoolVotingSettings,
                        as: 'votingSettings'
                    }]
                }
            ]
        });

        if (!poolPayout) {
            throw new Error('Payout not found');
        }

        const totalMembers = await PoolsMembers.count({
            where: {
                poolID: poolPayout.poolID
            }
        });

        const votedMembers = await PoolPayoutVotes.count({
            where: { payoutId: payoutId },
            distinct: true,
            col: 'voterId'
        });

        // Get vote distribution with weighted power
        const voteDistribution = await PoolPayoutVotes.findAll({
            where: { payoutId: payoutId },
            attributes: [
                'vote_type',
                [sequelize.fn('COUNT', '*'), 'count'],
                [sequelize.fn('SUM', sequelize.col('voting_power')), 'total_power']
            ],
            group: ['vote_type']
        });

        return {
            poolPayout,
            votingStats: {
                totalMembers,
                votedMembers,
                participationRate: totalMembers > 0 ? (votedMembers / totalMembers) * 100 : 0,
                requiredThreshold: poolPayout.pool?.votingSettings?.voting_threshold || 51,
                currentPercentage: poolPayout.approval_percentage,
                voteDistribution
            },
            votes: poolPayout.votes
        };
    } catch (error) {
        throw new Error(`Failed to fetch voting results: ${error.message}`);
    }
}

// Get eligible voters for a Payout
async function getEligibleVoters(payoutId) {
    try {
        const poolPayout = await PoolPayouts.findOne({
            where: { id: payoutId }
        });

        if (!poolPayout) {
            throw new Error('Payout not found');
        }

        const poolMembers = await PoolsMembers.findAll({
            where: {
                poolID: poolPayout.poolID
            },
            include: [{
                model: User,
                as: 'member',
                attributes: ['id', 'username', 'email', 'photo_id']
            }]
        });

        const existingVotes = await PoolPayoutVotes.findAll({
            where: { payoutId: payoutId },
            attributes: ['voterId', 'vote_type']
        });

        const voteMap = new Map();
        existingVotes.forEach(vote => {
            voteMap.set(vote.voterId, vote.vote_type);
        });

        const votingSettings = await PoolVotingSettings.findOne({
            where: { poolID: poolPayout.poolID }
        });

        return poolMembers.map(member => ({
            id: member.member.id,
            username: member.member.username,
            email: member.member.email,
            photo: member.member.photo_id,
            voting_power: calculateVotingPower(member, votingSettings?.voting_type),
            total_contributed: member.total_contributed,
            has_voted: voteMap.has(member.member.id),
            vote_type: voteMap.get(member.member.id) || null
        }));
    } catch (error) {
        throw new Error(`Failed to fetch eligible voters: ${error.message}`);
    }
}

// Check if user can vote on a Payout
async function canUserVote(payoutId, userId) {
    try {
        // 1. Fetch payout
        const poolPayout = await PoolPayouts.findOne({
            where: { id: payoutId }
        });

        if (!poolPayout) {
            return { canVote: false, reason: 'Payout not found' };
        }

        // 2. Check voting status
        if (!poolPayout.voting_enabled) {
            return { canVote: false, reason: 'Voting is not enabled for this payout' };
        }

        if (poolPayout.voting_status !== 'active') {
            return { canVote: false, reason: `Voting is ${poolPayout.voting_status}` };
        }

        // 3. Check voting period
        const now = new Date();
        if (poolPayout.voting_ends_at && now > new Date(poolPayout.voting_ends_at)) {
            return {
                canVote: false,
                reason: 'Voting period has ended',
                votingEnded: true
            };
        }

        // Check if voting hasn't started yet
        if (poolPayout.voting_starts_at && now < new Date(poolPayout.voting_starts_at)) {
            return {
                canVote: false,
                reason: 'Voting has not started yet',
                votingNotStarted: true
            };
        }

        // 4. Check if user is a pool member
        const poolMember = await PoolsMembers.findOne({
            where: {
                poolID: poolPayout.poolID,
                memberID: userId
            }
        });

        if (!poolMember) {
            return { canVote: false, reason: 'Not an active pool member' };
        }

        // 5. Check if user is the payout creator/recipient
        if (poolPayout.recipientId === userId || poolPayout.createdBy === userId) {
            return { canVote: false, reason: 'Cannot vote on your own payout' };
        }

        // 6. Check if user has already voted
        const existingVote = await PoolPayoutVotes.findOne({
            where: {
                payoutId: payoutId,
                voterId: userId
            }
        });

        // 7. Get voting settings from pool (not payout)
        const votingSettings = await PoolVotingSettings.findOne({
            where: { poolID: poolPayout.poolID }
        });

        // 8. Calculate voting power based on voting type
        const votingType = votingSettings?.voting_type || 'one_member_one_vote';
        const votingPower = calculateVotingPower(poolMember, votingType);

        // Check minimum voting power requirement if set
        const minVotingPower = votingSettings?.minimum_voting_power || 1;
        if (votingPower < minVotingPower) {
            return {
                canVote: false,
                reason: 'Insufficient voting power',
                votingPower,
                requiredVotingPower: minVotingPower,
                hasVoted: !!existingVote
            };
        }

        // 9. If user has already voted, they cannot vote again
        if (existingVote) {
            return {
                canVote: false,
                hasVoted: true,
                reason: 'Already voted',
                currentVote: existingVote.vote_type,
                votedAt: existingVote.createdAt,
                votingPower,
                votingEndsAt: poolPayout.voting_ends_at,
                votingStartsAt: poolPayout.voting_starts_at,
                votingType: votingType,
                payoutAmount: poolPayout.amount,
                poolId: poolPayout.poolID
            };
        }

        // 10. User can vote (has not voted yet)
        return {
            canVote: true,
            hasVoted: false,
            votingPower,
            votingEndsAt: poolPayout.voting_ends_at,
            votingStartsAt: poolPayout.voting_starts_at,
            votingType: votingType,
            payoutAmount: poolPayout.amount,
            poolId: poolPayout.poolID,
            timeRemaining: poolPayout.voting_ends_at
                ? Math.max(0, new Date(poolPayout.voting_ends_at) - now)
                : null
        };
    } catch (error) {
        console.error('Error in canUserVote:', error);
        throw new Error(`Failed to check voting eligibility: ${error.message}`);
    }
}

// Start voting for a Payout (admin function)
async function startVoting(payoutId, durationHours = 72) {
    const transaction = await sequelize.transaction();

    try {
        const poolPayout = await PoolPayouts.findOne({
            where: { id: payoutId },
            transaction
        });

        if (!poolPayout) {
            throw new Error('Payout not found');
        }

        const votingSettings = await PoolVotingSettings.findOne({
            where: { poolID: poolPayout.poolID },
            transaction
        });

        if (!votingSettings || !votingSettings.voting_enabled) {
            throw new Error('Voting is not enabled for this pool');
        }

        const votingStartsAt = new Date();
        const votingEndsAt = new Date(votingStartsAt.getTime() + (durationHours * 60 * 60 * 1000));

        await PoolPayouts.update({
            voting_enabled: true,
            voting_starts_at: votingStartsAt,
            voting_ends_at: votingEndsAt,
            voting_status: 'active',
            status: 'pending_voting'
        }, {
            where: { id: payoutId },
            transaction
        });

        await transaction.commit();
        return await poolPayout.reload();

    } catch (error) {
        await transaction.rollback();
        throw new Error(`Failed to start voting: ${error.message}`);
    }
}

module.exports = {
    castVote,
    getVotingResults,
    getEligibleVoters,
    canUserVote,
    startVoting,
    checkVotingThreshold
};