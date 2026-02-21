

exports.sendUnauthorizedResponse = (res, message) => {
    res.status(403).send({
        response_code: 403,
        response_message: message || "Unauthorized Request",
        response_body: null
    });
}

exports.sendNotFoundResponse = (res, message) => {
    res.status(404).send({
        response_code: 404,
        response_message: message || "Not Found",
        response_body: null
    });
}
exports.sendBadRequestResponse = (res, message) => {
    res.status(400).send({
        response_code: 400,
        response_message: message || "Bad Request",
        response_body: null
    });
}

exports.sendInternalServerErrorResponse = (res, message) => {
    res.status(500).send({
        response_code: 500,
        response_message: message || "Some error occurred",
        response_body: null
    });
}

exports.sendSuccessResponse = (res, response, message) => {
    res.status(200).send({
        response_code: 200,
        response_message: message,
        response_body: response || null
    });
}

exports.sendSuccessWithContentNotFoundResponse = (res, response, message) => {
    res.status(204).send({
        response_code: 204,
        response_message: message,
        response_body: response || null
    });
}

exports.sendForbiddenResponse = (res, message) => {
    res.status(403).send({
        response_code: 403,
        response_message: message || "Unauthorized Request",
        response_body: null
    });
}

exports.sendConflictResponse = (res, message, details = null) => {
    return res.status(409).send({
        response_code: 409,
        response_message: message || 'Resource already exists',
        response_body: null
    });
};