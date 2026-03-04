const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const {
    PoolsTypes,
    Pools,
    PoolsTypesAvaliableFormats,
    PoolsFormats,
    PoolsMembers,
    PoolsPayments,
    User,
    UserProjects,
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
    PoolPayouts,
    PoolPayoutTransactions,
    PoolPayoutVotes,
    PoolVotingSettings,
    PoolPayoutSettings,
    PoolPayoutApprovals,
    PoolPayoutMethods
} = require('../models');

const Operations = Object.freeze({ Create: 'Create', Read: 'Read', Update: 'Update', Delete: 'Delete' });

exports.Operations = Operations;

exports.authorization = (user, requirement, resource) => {
    let result = false;
    try {

        if (user) {

            if (resource instanceof User) {

                let allowedOperations = userAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof UserProjects) {

                let allowedOperations = userProjectsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }

            }
            else if (resource instanceof PoolsPayments) {

                let allowedOperations = poolsPaymentsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }

            }
            else if (resource instanceof Pools) {

                let allowedOperations = poolAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }

            }
            else if (resource instanceof PoolsMembers) {

                let allowedOperations = poolMembersAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }

            }
            else if (Array.isArray(resource) && resource.some(x => x instanceof PoolsMembers)) {

                let allowedOperations = poolMembersAllowedOperationsV2(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof PoolsMessages) {

                let allowedOperations = poolMessageAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof Notifications) {

                let allowedOperations = notificationsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof PoolsDeleteRequests) {

                let allowedOperations = poolsDeleteRequestsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof PoolsRefundRequests) {

                let allowedOperations = poolsRefundRequestsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (Array.isArray(resource) && resource.some(x => x instanceof PoolsPermissions)) {

                let allowedOperations = poolsPermissionsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof Notifications) {

                let allowedOperations = notificationsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof PoolsEvents) {

                let allowedOperations = poolsEventsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof Subscriptions) {

                let allowedOperations = subscriptionsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof SubscriptionsHistories) {

                let allowedOperations = subscriptionsHistoriesAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof SubscriptionsPayments) {

                let allowedOperations = subscriptionsPaymentsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof UserSocialMediaLinks) {

                let allowedOperations = userSocialMediaLinksAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof UserSettings) {

                let allowedOperations = userSettingsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            // NEW PAYOUT AUTHORIZATIONS
            else if (resource instanceof PoolPayouts) {

                let allowedOperations = poolPayoutsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof PoolPayoutApprovals) {

                let allowedOperations = poolPayoutApprovalsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof PoolPayoutMethods) {

                let allowedOperations = poolPayoutMethodsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof PoolPayoutSettings) {

                let allowedOperations = poolPayoutSettingsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof PoolPayoutTransactions) {

                let allowedOperations = poolPayoutTransactionsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof PoolPayoutVotes) {

                let allowedOperations = poolPayoutVotesAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource instanceof PoolVotingSettings) {

                let allowedOperations = poolVotingSettingsAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            // Additional cases for objects with poolID or similar references
            else if (resource && resource.poolID) {

                let allowedOperations = poolResourceAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }
            else if (resource && resource.payout_id) {

                let allowedOperations = payoutResourceAllowedOperations(user.id, resource);

                if (allowedOperations.includes(requirement)) {

                    result = true;

                }
            }

        }

    }
    catch (err) {
        throw err;
    }
    return result;
}

// Existing functions remain the same...
function userAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.id.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create, Operations.Delete);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function userProjectsAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.userId.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolsPaymentsAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.memberID.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.createdBy.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolMembersAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.memberID.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create, Operations.Delete);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolMembersAllowedOperationsV2(userId, resource) {
    let result = [];
    try {

        if (resource.filter(x => x.memberID.toString() === userId.toString()).length > 0) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        } else {
            result.push(Operations.Read);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolMessageAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.createdBy.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function notificationsAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.userToNotify.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create, Operations.Delete);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolsDeleteRequestsAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.createdBy.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolsRefundRequestsAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.createdBy.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolsPermissionsAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.filter(x => x.memberID.toString() === userId.toString()).length > 0) {

            if (resource.find(x => x.memberID.toString() === userId.toString() && x.roleID === 1)
                ||
                resource.find(x => x.memberID.toString() === userId.toString() && x.roleID === 2)
            ) {
                result.push(Operations.Read, Operations.Update, Operations.Create);
            } else {
                result.push(Operations.Read);
            }
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolsEventsAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.createdBy.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function subscriptionsAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.userId.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function subscriptionsHistoriesAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.userId.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function subscriptionsPaymentsAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.userId.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function userSocialMediaLinksAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.createdBy.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function userSettingsAllowedOperations(userId, resource) {
    let result = [];
    try {

        if (resource.userId.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

// NEW PAYOUT AUTHORIZATION FUNCTIONS

function poolPayoutsAllowedOperations(userId, resource) {
    let result = [];
    try {
        // Pool creator/admin can do everything
        if (resource.created_by && resource.created_by.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create, Operations.Delete);
        }
        // Recipient can read and update (for status changes)
        else if (resource.recipientId && resource.recipientId.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update);
        }
        // Pool members can read payouts
        else {
            result.push(Operations.Read);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolPayoutApprovalsAllowedOperations(userId, resource) {
    let result = [];
    try {
        // Approver can update their own approval
        if (resource.approver_id && resource.approver_id.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update);
        }
        // Payout creator and pool admins can read all approvals
        else {
            result.push(Operations.Read);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolPayoutMethodsAllowedOperations(userId, resource) {
    let result = [];
    try {
        // User can manage their own payout methods
        if (resource.user_id && resource.user_id.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create, Operations.Delete);
        }
        // No access for other users
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolPayoutSettingsAllowedOperations(userId, resource) {
    let result = [];
    try {
        // Only pool creator/admins can manage payout settings
        if (resource.poolID) {
            // Check if user is pool creator or admin
            result.push(Operations.Read, Operations.Update);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolPayoutTransactionsAllowedOperations(userId, resource) {
    let result = [];
    try {
        // Payout creator, recipient, and pool admins can read transactions
        if (resource.payout_id) {
            result.push(Operations.Read);
        }
        // Only system should create transactions
        if (requirement === Operations.Create) {
            result = []; // No manual creation allowed
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolPayoutVotesAllowedOperations(userId, resource) {
    let result = [];
    try {
        // Voter can manage their own votes
        if (resource.voter_id && resource.voter_id.toString() === userId.toString()) {
            result.push(Operations.Read, Operations.Update, Operations.Create, Operations.Delete);
        }
        // Pool members can read votes (for transparency)
        else {
            result.push(Operations.Read);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function poolVotingSettingsAllowedOperations(userId, resource) {
    let result = [];
    try {
        // Only pool creator/admins can manage voting settings
        if (resource.poolID) {
            // Check if user is pool creator or admin
            result.push(Operations.Read, Operations.Update);
        }
        // Pool members can read voting settings
        else {
            result.push(Operations.Read);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

// Generic authorization functions for objects with pool references
function poolResourceAllowedOperations(userId, resource) {
    let result = [];
    try {
        // Pool creator/admins have full access
        if (resource.poolID) {
            // Check if user is pool creator or admin
            result.push(Operations.Read, Operations.Update, Operations.Create);
        }
        // Regular pool members have read access
        else {
            result.push(Operations.Read);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

function payoutResourceAllowedOperations(userId, resource) {
    let result = [];
    try {
        // Users can access resources related to payouts they're involved in
        if (resource.payout_id) {
            result.push(Operations.Read);
        }
    }
    catch (err) {
        throw err;
    }
    return result;
}

// Helper function to check if user is pool admin (you might want to implement this)
async function isPoolAdmin(userId, poolId) {
    try {
        const poolMember = await PoolsMembers.findOne({
            where: {
                memberID: userId,
                poolID: poolId,
                role: { [Op.in]: ['owner', 'admin'] }
            }
        });
        return !!poolMember;
    } catch (err) {
        console.error('Error checking pool admin status:', err);
        return false;
    }
}

// Helper function to check if user is pool member
async function isPoolMember(userId, poolId) {
    try {
        const poolMember = await PoolsMembers.findOne({
            where: {
                memberID: userId,
                poolID: poolId,
                status: 'active'
            }
        });
        return !!poolMember;
    } catch (err) {
        console.error('Error checking pool member status:', err);
        return false;
    }
}