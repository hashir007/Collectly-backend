const express = require("express");
const router = express.Router();
const jwtAuth = require("../middleware/jwt-token-verifier");
const requestSchemaValidation = require("../middleware/requestSchemaValidation");
const cors = require('cors');
const homeController = require("../controllers/home.controller");
var corsOptions = {
    origin: [process.env.CLIENT_URL],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}


router.get("/",
    [
        homeController.Index
    ]
);


router.get("/index",
    [
        homeController.Index
    ]
);


module.exports = router;