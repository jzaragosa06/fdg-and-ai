const path = require("path");
const axios = require("axios");
const express = require('express');
const router = express.Router();


router.get("/", (req, res) =>
{
    res.sendFile(path.join(__dirname, "..", "views", "index.html"));
});




module.exports = router;