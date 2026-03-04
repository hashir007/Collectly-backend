const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const path = require('path');
const moment = require('moment');
const fs = require('fs').promises;
const { PoolPayoutSettings, Pools, PoolPayouts } = require('../models/index.js');


// Get payout settings for a Pools
async function getPayoutSettings(poolId) {
    try {
        let settings = await PoolPayoutSettings.findOne({
            where: { poolID: poolId },
            include: [{
                model: Pools,
                as: 'pool',
                attributes: ['id', 'name', 'total_contributed']
            }]
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await createDefaultSettings(poolId);
        }

        return settings;
    } catch (error) {
        throw new Error(`Failed to fetch payout settings: ${error.message}`);
    }
}

// Create default payout settings
async function createDefaultSettings(poolId) {
    try {
        const settings = await PoolPayoutSettings.create({
            poolID: poolId,
            max_payout_amount: 10000.00,
            min_payout_amount: 1.00,
            require_approval: false,
            approval_threshold: 500.00,
            max_daily_payouts: 10,
            allowed_payout_methods: ['bank_transfer', 'paypal']
        });

        return settings;
    } catch (error) {
        throw new Error(`Failed to create default payout settings: ${error.message}`);
    }
}

// Update payout settings
async function updatePayoutSettings(poolId, settingsData) {
    const transaction = await sequelize.transaction();

    try {
        let settings = await PoolPayoutSettings.findOne({
            where: { poolID: poolId },
            transaction
        });

        if (!settings) {
            settings = await PoolPayoutSettings.create({
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
        throw new Error(`Failed to update payout settings: ${error.message}`);
    }
}

// Validate payout amount against settings
async function validatePayoutAmount(poolId, amount) {
    try {
        const settings = await getPayoutSettings(poolId);
        const pool = await Pools.findByPk(poolId);

        const errors = [];

        if (amount < settings.min_payout_amount) {
            errors.push(`Amount must be at least ${settings.min_payout_amount}`);
        }

        if (amount > settings.max_payout_amount) {
            errors.push(`Amount cannot exceed ${settings.max_payout_amount}`);
        }

        if (amount > pool.total_contributed) {
            errors.push('Amount exceeds Pools balance');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    } catch (error) {
        throw new Error(`Failed to validate payout amount: ${error.message}`);
    }
}

// Check daily payout limit
async function checkDailyPayoutLimit(poolId) {
    try {
        const settings = await getPayoutSettings(poolId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayPayoutsCount = await PoolPayouts.count({
            where: {
                poolID: poolId,
                createdAt: {
                    [Op.between]: [today, tomorrow]
                }
            }
        });

        return {
            limit: settings.max_daily_payouts,
            used: todayPayoutsCount,
            remaining: settings.max_daily_payouts - todayPayoutsCount,
            exceeded: todayPayoutsCount >= settings.max_daily_payouts
        };
    } catch (error) {
        throw new Error(`Failed to check daily payout limit: ${error.message}`);
    }
}


module.exports = {
    getPayoutSettings,
    createDefaultSettings,
    updatePayoutSettings,
    validatePayoutAmount,
    checkDailyPayoutLimit
}