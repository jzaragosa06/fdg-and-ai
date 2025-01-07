const path = require("path");
const axios = require("axios");
const express = require('express');
const con = require("../db/connection")

const router = express.Router();

router.get("/login", (req, res) =>
{
    res.render("auth/login");
});

router.post("/login", (req, res) =>
{
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
    con.query(sql, [email, password], (err, result) =>
    {
        if (err)
        {
            res.status(500).send("error");
        }
        else
        {
            if (result.length == 0)
            {
                req.flash("error", "Account not found");
                console.log("not found");
                res.redirect("/auth/login");
            }
            else
            {
                req.session.user_id = result[0].id;
                console.log(`user id: ${req.session.user_id}`);


                const sql2 = "SELECT * FROM users WHERE id = ?";
                con.query(sql2, [req.session.user_id], (err2, result2) =>
                {
                    if (err2)
                    {
                        req.flash("error", "Account not found");
                        console.log("not found");
                        res.redirect("/auth/login");
                    }
                    else
                    {
                        //get the name
                        req.session.name = result2[0].name;
                        req.flash("success", "Login Successfully");
                        res.redirect("/home");
                    }
                });
            }

        }
    });
});

router.get("/register", (req, res) =>
{
    res.render("auth/register");
});

router.post("/register", (req, res) =>
{
    const { fname, lname, email, password, confirm_password } = req.body;
    const name = fname + " " + lname;

    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    con.query(sql, [name, email, password], (err, result) =>
    {
        if (err)
        {
            req.flash("error", err);
            res.redirect("/auth/register");
        } else
        {
            console.log(`id: ${result.insertId}`);

            const sql2 = "SELECT * FROM users WHERE id = ?";
            con.query(sql2, [result.insertId], (err2, result2) =>
            {
                if (err2)
                {
                    req.flash("error", err);
                    res.redirect("/auth/register");
                }
                else
                {
                    //get the name
                    req.session.name = result2[0].name;
                    //save the id in the session
                    req.session["user_id"] = result.insertId;
                    //req.flash("success", "Account created successfully");
                    res.redirect("/home?initial=true");
                }
            });


        }
    });


});



module.exports = router;