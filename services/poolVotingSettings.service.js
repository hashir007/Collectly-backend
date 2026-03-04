const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const path = require('path');
const moment = require('moment');
const fs = require('fs').promises;
const { PoolVotingSettings, Pools, PoolPayouts, PoolPayoutVotes, PoolsMembers, User } = require('../models/index.js');

// Get voting settings for a Pool
async function getVotingSettings(poolId) {
    try {
        let settings = await PoolVotingSettings.findOne({
            where: { poolID: poolId },
            include: [{
                model: Pools,
                as: 'Pool',
                attributes: ['id', 'name']
            }]
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await createDefaultSettings(poolId);
        }

        return settings;
    } catch (error) {
        throw new Error(`Failed to fetch voting settings: ${error.message}`);
    }
}

// Create default voting settings
async function createDefaultSettings(poolId) {
    try {
        const settings = await PoolVotingSettings.create({
            poolID: poolId,
            voting_enabled: false,
            voting_threshold: 51.00,
            voting_duration: 72,
            min_voters: 1,
            voting_type: 'one_member_one_vote',
            auto_approve: false,
            allow_abstain: true,
            require_quorum: false,
            quorum_percentage: 50.00
        });

        return settings;
    } catch (error) {
        throw new Error(`Failed to create default voting settings: ${error.message}`);
    }
}

// Update voting settings
async function updateVotingSettings(poolId, settingsData) {
    const transaction = await sequelize.transaction();

    try {
        let settings = await PoolVotingSettings.findOne({
            where: { poolID: poolId },
            transaction
        });

        if (!settings) {
            settings = await PoolVotingSettings.create({
                poolID: poolId,
                ...settingsData
            }, { transaction });
        } else {
            await settings.update(settingsData, { transaction });
        }

        await transaction.commit();
        return await settings.reload();

    } catch (error) {
        await transaction.rollback();
        throw new Error(`Failed to update voting settings: ${error.message}`);
    }
}

// Enable/disable voting for a Pool
async function toggleVoting(poolId, enabled) {
    try {
        const settings = await getVotingSettings(poolId);
        await settings.update({ voting_enabled: enabled });
        return settings;
    } catch (error) {
        throw new Error(`Failed to toggle voting: ${error.message}`);
    }
}

// Validate voting settings
function validateVotingSettings(settings) {
    const errors = [];

    if (settings.voting_threshold < 1 || settings.voting_threshold > 100) {
        errors.push('Voting threshold must be between 1 and 100 percent');
    }

    if (settings.voting_duration < 1 || settings.voting_duration > 720) {
        errors.push('Voting duration must be between 1 and 720 hours');
    }

    if (settings.min_voters < 1) {
        errors.push('Minimum voters must be at least 1');
    }

    if (settings.require_quorum && (settings.quorum_percentage < 1 || settings.quorum_percentage > 100)) {
        errors.push('Quorum percentage must be between 1 and 100 percent');
    }

    return errors;
}

async function getVotingAnalytics(poolId, settings) {
    try {
        // Get all payouts for this pool that have voting enabled
        const poolPayouts = await PoolPayouts.findAll({
            where: {
                poolID: poolId,
                voting_enabled: true
            },
            include: [{
                model: PoolPayoutVotes,
                as: 'votes'
            }]
        });

        // Get total number of pool members eligible to vote
        const totalEligibleVoters = await getEligibleVotersCount(poolId);

        // Calculate voting statistics
        const basicStats = await calculateBasicStats(poolPayouts, totalEligibleVoters);
        const voteDistribution = await calculateVoteDistribution(poolPayouts);
        const recentActivity = await getRecentActivity(poolPayouts);
        const mostActiveVoters = await getMostActiveVoters(poolPayouts);
        const performanceMetrics = await calculatePerformanceMetrics(poolPayouts, basicStats);

        return {
            // Basic settings
            voting_enabled: settings.voting_enabled,

            // Overall statistics
            total_voting_payouts: basicStats.totalVotingPayouts,
            total_votes: basicStats.totalVotes,
            total_eligible_voters: totalEligibleVoters,

            // Outcome statistics
            payout_outcomes: {
                approved: basicStats.totalApprovedPayouts,
                rejected: basicStats.totalRejectedPayouts,
                pending: basicStats.totalPendingPayouts
            },

            // Rate statistics
            overall_approval_rate: basicStats.overallApprovalRate,
            average_approval_rate: basicStats.averageApprovalRate,
            average_participation: basicStats.averageParticipation,
            voting_efficiency: basicStats.votingEfficiency,

            // Vote distribution
            vote_distribution: voteDistribution,

            // Recent activity
            recent_activity: recentActivity,

            // Top voters
            most_active_voters: mostActiveVoters,

            // Settings reference
            settings: {
                voting_threshold: settings.voting_threshold,
                voting_duration: settings.voting_duration,
                min_voters: settings.min_voters,
                voting_type: settings.voting_type,
                auto_approve: settings.auto_approve
            },

            // Performance metrics
            performance: performanceMetrics
        };
    } catch (error) {
        throw new Error(`Failed to get voting analytics: ${error.message}`);
    }
}

async function getEligibleVotersCount(poolId) {
    try {

        return await PoolsMembers.count({
            where: { poolID: poolId }
        });
    } catch (error) {
        console.error('Error getting eligible voters count:', error);
        return 0;
    }
}

async function calculateBasicStats(poolPayouts, totalEligibleVoters) {
    let totalVotes = 0;
    let totalApprovedPayouts = 0;
    let totalRejectedPayouts = 0;
    let totalPendingPayouts = 0;
    let totalVotingPayouts = poolPayouts.length;

    const participationByPayout = [];
    const approvalRates = [];

    // Analyze each payout
    for (const payout of poolPayouts) {
        const payoutVotes = payout.votes || [];
        const payoutTotalVotes = payoutVotes.length;

        // Count vote types for this payout
        const payoutVoteDistribution = {
            approve: payoutVotes.filter(v => v.vote_type === 'approve').length,
            reject: payoutVotes.filter(v => v.vote_type === 'reject').length,
            abstain: payoutVotes.filter(v => v.vote_type === 'abstain').length
        };

        // Add to overall totals
        totalVotes += payoutTotalVotes;

        // Calculate participation rate for this payout
        const participationRate = totalEligibleVoters > 0 ?
            (payoutTotalVotes / totalEligibleVoters) * 100 : 0;
        participationByPayout.push(participationRate);

        // Calculate approval rate for this payout
        if (payoutTotalVotes > 0) {
            const approvalRate = (payoutVoteDistribution.approve / payoutTotalVotes) * 100;
            approvalRates.push(approvalRate);
        }

        // Count payout outcomes
        switch (payout.voting_result) {
            case 'approved':
                totalApprovedPayouts++;
                break;
            case 'rejected':
                totalRejectedPayouts++;
                break;
            case 'pending':
                totalPendingPayouts++;
                break;
        }
    }

    // Calculate overall averages
    const averageParticipation = participationByPayout.length > 0 ?
        participationByPayout.reduce((sum, rate) => sum + rate, 0) / participationByPayout.length : 0;

    const averageApprovalRate = approvalRates.length > 0 ?
        approvalRates.reduce((sum, rate) => sum + rate, 0) / approvalRates.length : 0;

    // Calculate overall approval rate based on total votes
    const overallApprovalRate = totalVotes > 0 ?
        (getTotalApproveVotes(poolPayouts) / totalVotes) * 100 : 0;

    // Calculate voting efficiency (success rate)
    const votingEfficiency = totalVotingPayouts > 0 ?
        (totalApprovedPayouts / totalVotingPayouts) * 100 : 0;

    return {
        totalVotes,
        totalApprovedPayouts,
        totalRejectedPayouts,
        totalPendingPayouts,
        totalVotingPayouts,
        overallApprovalRate: parseFloat(overallApprovalRate.toFixed(2)),
        averageApprovalRate: parseFloat(averageApprovalRate.toFixed(2)),
        averageParticipation: parseFloat(averageParticipation.toFixed(2)),
        votingEfficiency: parseFloat(votingEfficiency.toFixed(2))
    };
}

async function calculateVoteDistribution(poolPayouts) {
    let approve = 0;
    let reject = 0;
    let abstain = 0;

    for (const payout of poolPayouts) {
        const payoutVotes = payout.votes || [];
        approve += payoutVotes.filter(v => v.vote_type === 'approve').length;
        reject += payoutVotes.filter(v => v.vote_type === 'reject').length;
        abstain += payoutVotes.filter(v => v.vote_type === 'abstain').length;
    }

    const totalVotes = approve + reject + abstain;

    return {
        approve,
        reject,
        abstain,
        approve_percentage: totalVotes > 0 ? parseFloat(((approve / totalVotes) * 100).toFixed(2)) : 0,
        reject_percentage: totalVotes > 0 ? parseFloat(((reject / totalVotes) * 100).toFixed(2)) : 0,
        abstain_percentage: totalVotes > 0 ? parseFloat(((abstain / totalVotes) * 100).toFixed(2)) : 0
    };
}

async function getRecentActivity(poolPayouts) {
    try {
        const payoutIds = poolPayouts.map(p => p.id);
        let dailyVotes = []; // Declare dailyVotes here

        // Get recent voting activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentVotes = await PoolPayoutVotes.count({
            where: {
                payoutID: { [Op.in]: payoutIds },
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        // Get voting trends by time (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (payoutIds && payoutIds.length > 0) {
            dailyVotes = await sequelize.query(`
                SELECT 
                    DATE(createdAt) as date,
                    COUNT(*) as votes,
                    SUM(CASE WHEN vote_type = 'approve' THEN 1 ELSE 0 END) as approves,
                    SUM(CASE WHEN vote_type = 'reject' THEN 1 ELSE 0 END) as rejects
                FROM pool_payout_votes 
                WHERE payoutID IN (:payoutIds) 
                AND createdAt >= :sevenDaysAgo
                GROUP BY DATE(createdAt)
                ORDER BY date ASC 
            `, {
                replacements: { payoutIds, sevenDaysAgo },
                type: QueryTypes.SELECT
            });
        }

        return {
            votes_last_30_days: recentVotes,
            daily_votes: dailyVotes
        };
    } catch (error) {
        console.error('Error getting recent activity:', error);
        return {
            votes_last_30_days: 0,
            daily_votes: []
        };
    }
}

async function getMostActiveVoters(poolPayouts) {
    try {
        const payoutIds = poolPayouts.map(p => p.id);

        const mostActiveVoters = await PoolPayoutVotes.findAll({
            attributes: [
                'voterID',
                [sequelize.fn('COUNT', sequelize.col('PoolPayoutVotes.id')), 'voteCount'],
                [sequelize.fn('MAX', sequelize.col('PoolPayoutVotes.createdAt')), 'lastVoted']
            ],
            include: [{
                model: User,
                as: 'voter',
                attributes: ['id', 'username']
            }],
            where: {
                payoutID: { [Op.in]: payoutIds }
            },
            group: ['voterID'],
            order: [[sequelize.literal('voteCount'), 'DESC']],
            limit: 5,
            raw: true
        });

        // If you have a Users model, you can join it here
        // For now, returning basic voter info
        return mostActiveVoters.map(voter => ({
            voter: { username: voter[`voter.username`], id: voter[`voter.id`] },
            voteCount: parseInt(voter.voteCount),
            lastVoted: voter.lastVoted
        }));
    } catch (error) {
        console.error('Error getting most active voters:', error);
        return [];
    }
}

async function calculatePerformanceMetrics(poolPayouts, basicStats) {
    const totalVotingPayouts = basicStats.totalVotingPayouts;
    const totalPendingPayouts = basicStats.totalPendingPayouts;

    return {
        quorum_achievement_rate: totalVotingPayouts > 0 ?
            parseFloat(((totalVotingPayouts - totalPendingPayouts) / totalVotingPayouts * 100).toFixed(2)) : 0,
        average_voting_duration: await calculateAverageVotingDuration(poolPayouts),
        success_rate: basicStats.votingEfficiency
    };
}

async function calculateAverageVotingDuration(poolPayouts) {
    const completedPayouts = poolPayouts.filter(p =>
        p.voting_status === 'completed' &&
        p.voting_started_at &&
        p.voting_ends_at
    );

    if (completedPayouts.length === 0) return 0;

    const totalDuration = completedPayouts.reduce((sum, payout) => {
        const start = new Date(payout.voting_started_at);
        const end = new Date(payout.voting_ends_at);
        const durationHours = (end - start) / (1000 * 60 * 60);
        return sum + durationHours;
    }, 0);

    return parseFloat((totalDuration / completedPayouts.length).toFixed(2));
}

function getTotalApproveVotes(poolPayouts) {
    return poolPayouts.reduce((total, payout) => {
        const payoutVotes = payout.votes || [];
        return total + payoutVotes.filter(v => v.vote_type === 'approve').length;
    }, 0);
}

module.exports = {
    getVotingSettings,
    createDefaultSettings,
    updateVotingSettings,
    toggleVoting,
    validateVotingSettings,
    getVotingAnalytics
};