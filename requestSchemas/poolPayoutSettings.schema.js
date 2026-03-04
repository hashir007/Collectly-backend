const yup = require('yup');

const GetPayoutSettingsSchema = yup.object().shape({
  params: yup.object().shape({
    poolId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({})
});

const UpdatePayoutSettingsSchema = yup.object().shape({
  params: yup.object().shape({
    poolId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({
    max_payout_amount: yup.number().positive().min(0.01).optional(),
    min_payout_amount: yup.number().positive().min(0.01).optional(),
    require_approval: yup.boolean().optional(),
    approval_threshold: yup.number().positive().min(0.01).optional(),
    max_daily_payouts: yup.number().integer().min(1).optional(),
    allowed_payout_methods: yup.array().of(yup.string()).optional()
  })
});

const ValidatePayoutAmountSchema = yup.object().shape({
  params: yup.object().shape({
    poolId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({
    amount: yup.number().positive().min(0.01).required()
  })
});

const CheckDailyPayoutLimitSchema = yup.object().shape({
  params: yup.object().shape({
    poolId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({})
});

const GetPayoutSettingsAnalyticsSchema = yup.object().shape({
  params: yup.object().shape({
    poolId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({})
});

module.exports = {
  GetPayoutSettingsSchema,
  UpdatePayoutSettingsSchema,
  ValidatePayoutAmountSchema,
  CheckDailyPayoutLimitSchema,
  GetPayoutSettingsAnalyticsSchema
};