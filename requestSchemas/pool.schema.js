const yup = require("yup");


const GetPoolByIDSchema = yup.object({
    params: yup.object({
        id: yup.number().required(),
    })
});

const FilterPoolsSchema = yup.object({
    query: yup.object({
        term: yup.string().nullable(true)
    }),
    params: yup.object({
        page: yup.string().required(),
        pageSize: yup.string().required()
    }),
    body: yup.object({
        joined: yup.string().nullable(true),
        owner: yup.string().nullable(true),
        closed: yup.string().nullable(true),
        opened: yup.string().nullable(true),
        orderBy: yup.string().nullable(true)
    })
});

const FilterPoolMembersSchema = yup.object({
    query: yup.object({
        term: yup.string().nullable(true)
    }),
    params: yup.object({
        id: yup.number().required()
    }),
    body: yup.object({
        filters: yup.object({
            paymentStatus: yup.string().nullable(true),
            minAmount: yup.number().nullable(true),
            joiningDate: yup.string().nullable(true),
            sortOrder: yup.string().nullable(true),
        }).default({})
    })
});

const MakeMemberPoolAdminSchema = yup.object({
    params: yup.object({
        id: yup.number().required(),
        memberID: yup.number().required()
    })
});

const GetPoolMembersWithGoalAmountSchema = yup.object({
    params: yup.object({
        id: yup.number().required(),
    })
});

const InviteNotificationSchema = yup.object({
    params: yup.object({
        id: yup.number().required(),
        mode: yup.string().oneOf(['email', 'sms']).required()
    }),
    body: yup.object({
        recipients: yup.array().of(
            yup.string().required()
        ).required(),
    }).default({})
});


const RequestToJoinPoolSchema = yup.object({
    params: yup.object({
        id: yup.number().required(),
    }),
    body: yup.object({
        referral_code: yup.string().nullable(true),
    })
});

const GetPendingJoinRequestsSchema = yup.object({
    params: yup.object({
        id: yup.number().required(),
    })
});


const GetJoinPoolDetailsSchema = yup.object({
    params: yup.object({
        id: yup.number().required(),
    })
});

const UpdatePoolJoiningRequestSchema = yup.object({
    params: yup.object({
        id: yup.number().required(),
        requestId: yup.number().required(),
        memberID: yup.number().required()
    }),
    body: yup.object({
        action: yup.string().oneOf(['approve', 'reject']).required()
    })
});


const UploadPoolImageSchema = yup.object().shape({
    files: yup.array().min(1, "At least one file is required"),
    params: yup.object({
        id: yup.number().required()
    })
})

const UpdatePoolSchema = yup.object({
    body: yup.object({
        name: yup.string()
            .min(3, 'Pool name must be at least 3 characters')
            .required('Pool name is required'),
        description: yup.string()
            .required('Description is required'),
        defaultBuy_in_amount: yup.number()
            .typeError('Default buy-in must be a number')
            .min(1, 'Default buy-in must be at least $1')
            .required('Default buy-in amount is required'),
        goal_amount: yup.number()
            .typeError('Goal amount must be a number')
            .min(10, 'Goal amount must be at least $10')
            .required('Goal amount is required'),
        is_private: yup.boolean()
            .required('Privacy setting is required'),
        photo_id: yup
            .mixed()
            .nullable()
            .transform(value => value === undefined ? null : value),
        modifiedBy: yup.number()
            .typeError('Modified by must be a number')
            .required('Modified by is required'),
        // Voting settings with defaults (optional for updates)
        voting_enabled: yup.boolean().default(false),
        voting_threshold: yup.number()
            .typeError('Voting threshold must be a number')
            .min(1, 'Voting threshold must be at least 1%')
            .max(100, 'Voting threshold cannot exceed 100%')
            .default(51.00)
            .nullable(),
        voting_duration: yup.number()
            .typeError('Voting duration must be a number')
            .min(1, 'Voting duration must be at least 1 hour')
            .max(720, 'Voting duration cannot exceed 720 hours (30 days)')
            .default(72)
            .nullable(),
        min_voters: yup.number()
            .typeError('Minimum voters must be a number')
            .min(1, 'Minimum voters must be at least 1')
            .default(1)
            .nullable(),
        voting_type: yup.string()
            .oneOf(['one_member_one_vote', 'one_share_one_vote', 'weighted_by_contribution'], 'Invalid voting type')
            .default('one_member_one_vote')
            .nullable(),
        auto_approve: yup.boolean().default(false),
        allow_abstain: yup.boolean().default(true),
        require_quorum: yup.boolean().default(false),
        quorum_percentage: yup.number()
            .typeError('Quorum percentage must be a number')
            .min(1, 'Quorum percentage must be at least 1%')
            .max(100, 'Quorum percentage cannot exceed 100%')
            .default(50.00)
            .nullable()
    }),
    params: yup.object({
        id: yup.string().required('Pool ID is required')
    })
});


const PoolDeleteRequestSchema = yup.object({
    params: yup.object({
        id: yup.number().required(),
    })
});

const CreatePoolSchema = yup.object({
    body: yup.object({
        name: yup.string()
            .min(3, 'Pool name must be at least 3 characters')
            .required('Pool name is required'),
        description: yup.string()
            .required('Description is required'),
        defaultBuy_in_amount: yup.number()
            .typeError('Default buy-in must be a number')
            .min(1, 'Default buy-in must be at least $1')
            .required('Default buy-in amount is required'),
        goal_amount: yup.number()
            .typeError('Goal amount must be a number')
            .min(10, 'Goal amount must be at least $10')
            .required('Goal amount is required'),
        is_private: yup.boolean()
            .required('Privacy setting is required'),
        photo_id: yup
            .mixed()
            .nullable()
            .transform(value => value === undefined ? null : value),
        // Voting settings
        voting_enabled: yup.boolean()
            .default(false),
        voting_threshold: yup.number()
            .typeError('Voting threshold must be a number')
            .min(1, 'Voting threshold must be at least 1%')
            .max(100, 'Voting threshold cannot exceed 100%')
            .when('voting_enabled', {
                is: true,
                then: schema => schema.required('Voting threshold is required when voting is enabled'),
                otherwise: schema => schema.nullable()
            }),
        voting_duration: yup.number()
            .typeError('Voting duration must be a number')
            .min(1, 'Voting duration must be at least 1 hour')
            .max(720, 'Voting duration cannot exceed 720 hours (30 days)')
            .when('voting_enabled', {
                is: true,
                then: schema => schema.required('Voting duration is required when voting is enabled'),
                otherwise: schema => schema.nullable()
            }),
        min_voters: yup.number()
            .typeError('Minimum voters must be a number')
            .min(1, 'Minimum voters must be at least 1')
            .when('voting_enabled', {
                is: true,
                then: schema => schema.required('Minimum voters is required when voting is enabled'),
                otherwise: schema => schema.nullable()
            }),
        voting_type: yup.string()
            .oneOf(['one_member_one_vote', 'one_share_one_vote', 'weighted_by_contribution'], 'Invalid voting type')
            .when('voting_enabled', {
                is: true,
                then: schema => schema.required('Voting type is required when voting is enabled'),
                otherwise: schema => schema.nullable()
            }),
        auto_approve: yup.boolean()
            .default(false),
        allow_abstain: yup.boolean()
            .default(true),
        require_quorum: yup.boolean()
            .default(false),
        quorum_percentage: yup.number()
            .typeError('Quorum percentage must be a number')
            .min(0, 'Quorum percentage must be at least 0%')  
            .max(100, 'Quorum percentage cannot exceed 100%')
            .when('require_quorum', {
                is: true,
                then: schema => schema
                    .required('Quorum percentage is required when quorum is required')
                    .min(1, 'Quorum percentage must be at least 1% when quorum is required'), 
                otherwise: schema => schema
                    .nullable()
                    .transform(value => value === undefined ? null : value)
            })

    })
});

const SubmitReportSchema = yup.object({
    body: yup.object({
        categories: yup.array()
            .required('At least one category is required')
            .min(1, 'At least one category must be selected')
            .max(5, 'Maximum 5 categories allowed')
            .of(
                yup.string()
                    .oneOf(
                        ['spam', 'scam', 'harassment', 'inappropriate', 'privacy', 'illegal', 'other'],
                        'Invalid report category'
                    )
                    .required('Category cannot be empty') // Added protection
            )
            .test(
                'unique-categories',
                'Duplicate categories are not allowed',
                function (categories) {
                    if (!categories) return true;
                    return new Set(categories).size === categories.length;
                }
            ),
        primaryReason: yup.string()
            .optional()
            .max(500, 'Primary reason must be less than 500 characters')
            .trim()
            .transform(value => value || undefined),
        additionalDetails: yup.string()
            .optional()
            .max(2000, 'Additional details must be less than 2000 characters')
            .trim()
            .transform(value => value || undefined)
    }),
    params: yup.object({
        id: yup.string()
            .required('Pool ID is required')
            .matches(/^[a-zA-Z0-9_-]+$/, 'Invalid Pool ID format') // Add format validation if applicable
    })
}).noUnknown(true, 'Unknown fields are not allowed');

module.exports = {
    GetPoolByIDSchema,
    FilterPoolsSchema,
    FilterPoolMembersSchema,
    GetPoolMembersWithGoalAmountSchema,
    MakeMemberPoolAdminSchema,
    InviteNotificationSchema,
    RequestToJoinPoolSchema,
    GetPendingJoinRequestsSchema,
    GetJoinPoolDetailsSchema,
    UpdatePoolJoiningRequestSchema,
    UploadPoolImageSchema,
    UpdatePoolSchema,
    PoolDeleteRequestSchema,
    CreatePoolSchema,
    SubmitReportSchema
}


