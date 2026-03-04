const yup = require('yup');

// Wrap each schema in yup.object() to create proper Yup schema objects
const GetPoolPayoutsSchema = yup.object().shape({
  params: yup.object().shape({
    poolId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({
    page: yup.number().integer().positive().default(1),
    limit: yup.number().integer().positive().max(100).default(10),
    status: yup.string().oneOf(['pending', 'processing', 'completed', 'failed', 'cancelled', 'pending_voting']),
    voting_status: yup.string().oneOf(['not_started', 'active', 'completed', 'cancelled']),
    search: yup.string().max(100)
  }),
  body: yup.object().shape({}) // Empty body for GET requests
});

const GetPayoutByIdSchema = yup.object().shape({
  params: yup.object().shape({
    payoutId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({})
});

const CreatePayoutSchema = yup.object().shape({
  params: yup.object().shape({
    poolId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({
    recipientId: yup.number().integer().positive().required(),
    amount: yup.number().positive().min(0.01).required(),
    description: yup.string().min(1).max(500).required(),
    enableVoting: yup.boolean().default(false)
  })
});

const UpdatePayoutStatusSchema = yup.object().shape({
  params: yup.object().shape({
    payoutId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({
    status: yup
      .string()
      .oneOf(['pending', 'processing', 'completed', 'failed', 'cancelled', 'pending_voting'])
      .required(),
    failureReason: yup.string()
      .max(500)
      .nullable()
      .when('status', {
        is: 'failed',
        then: (schema) => schema.required('Failure reason is required when status is failed'),
        otherwise: (schema) => schema.notRequired()
      })
  })
});

const CancelPayoutSchema = yup.object().shape({
  params: yup.object().shape({
    payoutId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({
    reason: yup.string().max(500).optional()
  })
});

const GetPayoutStatsSchema = yup.object().shape({
  params: yup.object().shape({
    poolId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({})
});

const GetEligibleMembersSchema = yup.object().shape({
  params: yup.object().shape({
    poolId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({})
});

module.exports = {
  GetPoolPayoutsSchema,
  GetPayoutByIdSchema,
  CreatePayoutSchema,
  UpdatePayoutStatusSchema,
  CancelPayoutSchema,
  GetPayoutStatsSchema,
  GetEligibleMembersSchema
};