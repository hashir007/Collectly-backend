const jwt = require('jsonwebtoken');


function generateJWTToken(username, email, Id) {
    return jwt.sign({
        id: Id,
        username: username,
        email: email
    }, process.env.SECRET, {
        expiresIn: '3h'
    });
}

function generateJWTRefreshToken(username, email, Id) {
    return jwt.sign({
        id: Id,
        username: username,
        email: email
    }, process.env.REFRESH_SECRET, {
        expiresIn: '30d'
    });
}

function generateJWTTokenMobile(username, email, Id) {
    return jwt.sign({
        id: Id,
        username: username,
        email: email
    }, process.env.SECRET, {
        expiresIn: '9999 years'
    });
}

function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
        return { decoded };
    } catch (err) {
        return { err };
    }
}



module.exports = {
    generateJWTToken,
    generateJWTRefreshToken,
    generateJWTTokenMobile,
    verifyRefreshToken
}
