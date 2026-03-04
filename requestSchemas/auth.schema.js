const { is } = require("bluebird");
const { notification } = require("paypal-rest-sdk");
const yup = require("yup");



const WebLoginSchema = yup.object({
    body: yup.object({
        username: yup.string().required(),
        password: yup.string().required()
    })
});


const WebRegisterSchema = yup.object({
    body: yup.object({
        username: yup.string().required(),
        email: yup.string().email().required(),
        password: yup.string()
            .min(8, "Password must be at least 8 characters")
            .matches(/[a-z]/, "Password must contain at least one lowercase letter")
            .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
            .matches(/[0-9]/, "Password must contain at least one number")
            .matches(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")
            .required("Password is required"),
        firstName: yup.string()
            .matches(/^[A-Za-z ]*$/, 'Please enter valid first name')
            .max(40)
            .required(),
        lastName: yup.string()
            .matches(/^[A-Za-z ]*$/, 'Please enter valid last name')
            .max(40)
            .required(),
        date_of_birth: yup.date().required(),
        phone: yup.string().required()
    })
});

const WebRefreshTokenSchema = yup.object({
    body: yup.object({
        refreshToken: yup.string().required()
    })
});


const CreateForgotPasswordSchema = yup.object({
    body: yup.object({
        email: yup.string().email().required()
    })
});

const UpdateForgotPasswordRequestCompleteSchema = yup.object({
    body: yup.object({
        resetPasswordToken: yup.string().required()
    })
});

const VerifyForgotPasswordRequestSchema = yup.object({
    body: yup.object({
        resetPasswordToken: yup.string().required()
    })
});

const FindUserByEmailSchema = yup.object({
    body: yup.object({
        email: yup.string().email().required()
    })
});

const ChangePasswordSchema = yup.object({
    body: yup.object({
        token: yup.string().required(),
        password: yup.string()
            .min(8, "Password must be at least 8 characters")
            .matches(/[a-z]/, "Password must contain at least one lowercase letter")
            .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
            .matches(/[0-9]/, "Password must contain at least one number")
            .matches(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")
            .required("Password is required")
    })
});

const ChangeAccountPasswordSchema = yup.object({
    params: yup.object({
        userId: yup.string().required()
    }),
    body: yup.object({
        oldPassword: yup.string().required(),
        newPassword: yup.string()
            .min(8, "Password must be at least 8 characters")
            .matches(/[a-z]/, "Password must contain at least one lowercase letter")
            .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
            .matches(/[0-9]/, "Password must contain at least one number")
            .matches(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")
            .required("Password is required")
    })
});

const CreateEmailVerificationRequestSchema = yup.object({
    params: yup.object({
        id: yup.string().required()
    })
});

const MarkEmailVerifiedSchema = yup.object({
    query: yup.object({
        token: yup.string().required()
    })
});

const DeleteAccountSchema = yup.object({
    body: yup.object({
        userId: yup.string().required()
    })
});

const HaveAccountMarkedForDeletionSchema = yup.object({
    params: yup.object({
        userId: yup.string().required()
    })
});

const GetNotificationsUnReadSchema = yup.object({
    params: yup.object({
        userId: yup.string().required(),
        page: yup.number().min(1).required(),
        pageSize: yup.number().min(1).required()
    }),
    body: yup.object({
        isRead: yup.boolean().notRequired()
    })
});

const MarkNotificationReadSchema = yup.object({
    params: yup.object({
        userId: yup.string().required(),
        notificationId: yup.string().required()
    })
});

const NotificationDeleteSchema = yup.object({
    params: yup.object({
        userId: yup.string().required(),
        notificationId: yup.string().required()
    })
});

const DownloadPersonalDataSchema = yup.object({
    params: yup.object({
        userId: yup.string().required()
    })
});

const DownloadExportFileSchema = yup.object({
    params: yup.object({
        token: yup.string().required()
    })
});



module.exports = {
    WebLoginSchema,
    WebRegisterSchema,
    WebRefreshTokenSchema,
    CreateForgotPasswordSchema,
    UpdateForgotPasswordRequestCompleteSchema,
    VerifyForgotPasswordRequestSchema,
    FindUserByEmailSchema,
    ChangePasswordSchema,
    ChangeAccountPasswordSchema,
    CreateEmailVerificationRequestSchema,
    MarkEmailVerifiedSchema,
    DeleteAccountSchema,
    HaveAccountMarkedForDeletionSchema,
    GetNotificationsUnReadSchema,
    MarkNotificationReadSchema,
    NotificationDeleteSchema,
    DownloadPersonalDataSchema,
    DownloadExportFileSchema
}