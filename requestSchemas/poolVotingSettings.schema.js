const yup = require('yup');

const GetVotingSettingsSchema = yup.object().shape({
    params: yup.object({
        poolId: yup.number().integer().positive().required()
    })
});

const UpdateVotingSettingsSchema = yup.object().shape({
    params: yup.object({
        poolId: yup.number().integer().positive().required()
    }),
    body: yup.object({
        voting_enabled: yup.boolean().optional(),
        voting_threshold: yup.number().min(1).max(100).optional(),
        voting_duration: yup.number().integer().min(1).max(720).optional(),
        min_voters: yup.number().integer().min(1).optional(),
        voting_type: yup.string().oneOf(['one_share_one_vote', 'one_member_one_vote', 'weighted_by_contribution']).optional(),
        auto_approve: yup.boolean().optional(),
        allow_abstain: yup.boolean().optional(),
        require_quorum: yup.boolean().optional(),
        quorum_percentage: yup.number().min(1).max(100).optional()
    })
});

const ToggleVotingSchema = yup.object().shape({
    params: yup.object({
        poolId: yup.number().integer().positive().required()
    }),
    body: yup.object({
        enabled: yup.boolean().required()
    })
});

const GetVotingAnalyticsSchema = yup.object().shape({
    params: yup.object({
        poolId: yup.number().integer().positive().required()
    })
});

module.exports = {
    GetVotingSettingsSchema,
    UpdateVotingSettingsSchema,
    ToggleVotingSchema,
    GetVotingAnalyticsSchema
};