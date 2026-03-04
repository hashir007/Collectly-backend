const yup = require("yup");


const getAccountSchema = yup.object({
    params: yup.object({
        userId: yup.number().required(),
    })
});

const updateProfileSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    }),
    body: yup.object({
        firstName: yup.string().required(),
        lastName: yup.string().required(),
        dateOfBirth: yup.string().required(),
        phone: yup.string().required()
    })
});

const getPayoutDetailsSchema = yup.object({
    params: yup.object({
        userId: yup.number().required(),
    })
});

const updatePayoutDetailsSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    }),
    body: yup.object({
        payoutEmailAddress: yup.string().required(),
        payoutPayerID: yup.string().required()
    })
});

const getAllContributionByUserIdSchema = yup.object({
    params: yup.object({
        userId: yup.number().required(),
        page: yup.number().min(1).required(),
        pageSize: yup.number().min(1).required()
    })
});

const getSubscriptionsPaymentsSchema = yup.object({
    params: yup.object({
        userId: yup.number().required(),
        page: yup.number().min(1).required(),
        pageSize: yup.number().min(1).required()
    })
});

const getSubscriptionHistorySchema = yup.object({
    params: yup.object({
        userId: yup.number().required(),
        page: yup.number().min(1).required(),
        pageSize: yup.number().min(1).required()
    })
});

const getSubscriptionSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    })
});

const getSocialMediaByUserIdSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    })
});

const addOrUpdateSocialMediaLinksSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    }),
    body: yup.object({
        social: yup.string().required()
    })
});

const getUserSettingsSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    })
});


const updateUserSettingsSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    }),
    body: yup.object({
        settings: yup.object().required()
    })
});


const getMyAppsSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    })
});


const createAppSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    }),
    body: yup.object({
        name: yup.string().required()
    })
});

const getUserReferralsSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    })
});


const getIdentityVerificationStatusSchema = yup.object({
    params: yup.object({
        userId: yup.number().required()
    })
});

const uploadProfileImageSchema = yup.object().shape({
    files: yup.array().min(1, "At least one file is required"),
    params: yup.object({
        userId: yup.number().required()
    }),
    body: yup.object({
        removePhoto: yup.boolean().notRequired()
    })
})


const addcontactUsSchema = yup.object({
    body: yup.object({
        firstName: yup.string().required(),
        lastName: yup.string().required(),
        email: yup.string().required(),
        message: yup.string().max(2000).required()
    })
});

const getPoolStatisticsByUserIdSchema = yup.object({
    params: yup.object({
        userId: yup.string().required()
    }),
    query: yup.object({
        preset: yup.string()
            .oneOf([
                'This Week',
                'Last Week',
                'Last 2 Weeks',
                'Last Month',
                'Last 3 Months'
            ])
            .optional()
    })
});


module.exports = {
    getAccountSchema,
    updateProfileSchema,
    getPayoutDetailsSchema,
    updatePayoutDetailsSchema,
    getAllContributionByUserIdSchema,
    getSubscriptionHistorySchema,
    getSubscriptionsPaymentsSchema,
    getSubscriptionHistorySchema,
    getSubscriptionSchema,
    getSocialMediaByUserIdSchema,
    addOrUpdateSocialMediaLinksSchema,
    getUserSettingsSchema,
    updateUserSettingsSchema,
    getMyAppsSchema,
    createAppSchema,
    getUserReferralsSchema,
    getIdentityVerificationStatusSchema,
    uploadProfileImageSchema,
    addcontactUsSchema,
    getPoolStatisticsByUserIdSchema
}

