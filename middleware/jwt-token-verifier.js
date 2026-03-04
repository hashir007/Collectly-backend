var jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    var authHeader = req.headers['authorization'];

    if (!authHeader) return res.status(498).send({ response_code: 498, response_message: 'No token provided.', response_body: null });

    var token = authHeader.replace('Bearer ', '');
    if (!token)
        return res.status(498).send({ response_code: 498, response_message: 'No token provided.', response_body: null });

    jwt.verify(token, process.env.SECRET, function (err, decoded) {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).send({ response_code: 401, response_message: 'Token has expired.', response_body: null });
            } else {
                return res.status(498).send({ response_code: 498, response_message: 'Failed to authenticate token.', response_body: null });
            }
        }
        // if everything good, save to request for use in other routes
        req.userData = decoded;
        next();
    });
}

module.exports = verifyToken;