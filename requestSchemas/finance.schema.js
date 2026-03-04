const yup = require("yup");




const GetFinalContributionAmountSchema = yup.object({
    params: yup.object({
        userId: yup.number().required(),
        amount: yup.number().required(),
    })
});

const CreatePaypalOrderSchema = yup.object({
    body: yup.object({
        contributionAmount: yup.number().required("required").positive().integer(),
        discountedContributionAmount: yup.number().required("required").positive().integer(),
        Id: yup.string().required(),
        discount: yup.number().required("required"),
        type: yup.string().required()
    })
});

const CapturePaypalOrderSchema = yup.object({
    body: yup.object({
        orderId: yup.string().required(),
        Id: yup.string().required(),
        type: yup.string().required()
    })
});



module.exports = {
    GetFinalContributionAmountSchema,
    CreatePaypalOrderSchema,
    CapturePaypalOrderSchema
}