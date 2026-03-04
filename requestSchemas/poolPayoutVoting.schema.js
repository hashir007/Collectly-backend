const yup = require('yup');

const CastVoteSchema = yup.object().shape({
  params: yup.object().shape({
    payoutId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({
    voteType: yup.string().oneOf(['approve', 'reject', 'abstain']).required(),
    comments: yup.string().max(500).optional()
  })
});

const GetVotingResultsSchema = yup.object().shape({
  params: yup.object().shape({
    payoutId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({})
});

const GetEligibleVotersSchema = yup.object().shape({
  params: yup.object().shape({
    payoutId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({})
});

const CheckVotingStatusSchema = yup.object().shape({
  params: yup.object().shape({
    payoutId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({})
});

const StartVotingSchema = yup.object().shape({
  params: yup.object().shape({
    payoutId: yup.number().integer().positive().required()
  }),
  query: yup.object().shape({}),
  body: yup.object().shape({
    durationHours: yup.number().integer().min(1).max(720).default(72)
  })
});

const GetUserVotingHistorySchema = yup.object().shape({
  params: yup.object().shape({}),
  query: yup.object().shape({
    page: yup.number().integer().positive().default(1),
    limit: yup.number().integer().positive().max(100).default(10)
  }),
  body: yup.object().shape({})
});

module.exports = {
  CastVoteSchema,
  GetVotingResultsSchema,
  GetEligibleVotersSchema,
  CheckVotingStatusSchema,
  StartVotingSchema,
  GetUserVotingHistorySchema
};