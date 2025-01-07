require("dotenv").config();
const express = require("express");
const path = require("path");
const axios = require("axios");
const session = require('express-session');
const flash = require('connect-flash');
const app = express();


// const indexRouter = require("./routes/index");
// const brainstorm1Router = require("./routes/brainstorm1");
// const brainstorm2Router = require("./routes/brainstorm2");
// const brainstorm3Router = require("./routes/brainstorm3");
// const authRouter = require("./routes/auth");
// const adminRouter = require("./routes/admin");


// Set up middleware and configurations
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
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

app.get("/", (req, res) =>
{
    res.sendFile(path.join(__dirname, "public", "html", "index.html"));
})


//Routes - with route level middleware
// app.use("/", indexRouter);
// app.use("/auth", authRouter);
// app.use("/admin", adminRouter);
// app.use("/brainstorm1", brainstorm1Router);
// app.use("/brainstorm2", brainstorm2Router);
// app.use("/brainstorm3", brainstorm3Router);

// Step 5: Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
{
    console.log(`Server is running on http://localhost:${PORT}`);
});
