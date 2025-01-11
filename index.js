require("dotenv").config();
const express = require("express");
const path = require("path");
const axios = require("axios");
const session = require('express-session');
const flash = require('connect-flash');
const app = express();


const indexRouter = require("./routes/index");
const brainstorm2Router = require("./routes/brainstorm2");
const brainstorm3Router = require("./routes/brainstorm3");


// Set up middleware and configurations
app.use(express.static(path.join(__dirname, "public")));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//configuration of session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
}));

//Routes - with route level middleware
app.use("/", indexRouter);
app.use("/brainstorm2", brainstorm2Router);
app.use("/brainstorm3", brainstorm3Router);

// Step 5: Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
{
    console.log(`Server is running on http://localhost:${PORT}`);
});
