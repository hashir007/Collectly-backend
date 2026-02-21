const yup = require("yup");

exports.CreateSubscriptionSchema = {
  body: yup.object({
    planId: yup.number().integer().required("Plan ID is required"),
    subscriptionAmount: yup.number().positive("Subscription amount must be positive").required("Subscription amount is required"),
    finalAmount: yup.number().positive("Final amount must be positive").optional(),
    discount: yup.number().min(0, "Discount cannot be negative").optional(),
    type: yup.string().oneOf(['SUBSCRIPTION'], "Type must be SUBSCRIPTION").optional()
  })
};

exports.CaptureSubscriptionSchema = {
  body: yup.object({
    subscriptionId: yup.string().required("Subscription ID is required"),
    planId: yup.number().integer().optional(),
    type: yup.string().oneOf(['SUBSCRIPTION'], "Type must be SUBSCRIPTION").optional()
  })
};

exports.GetSubscriptionDetailsSchema = {
  params: yup.object({
    subscriptionId: yup.string().required("Subscription ID is required")
  })
};

exports.CancelSubscriptionSchema = {
  body: yup.object({
    subscriptionId: yup.string().required("Subscription ID is required"),
    reason: yup.string().max(500, "Reason cannot exceed 500 characters").optional()
  })
};

exports.GetUserSubscriptionsSchema = {
  query: yup.object({
    page: yup.number().integer().min(1, "Page must be at least 1").default(1),
    limit: yup.number().integer().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(10)
  })
};