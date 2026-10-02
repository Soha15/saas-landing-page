require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

const User = mongoose.model("User", {
    name: String,
    email: String,
    password: String,
    verified: { type: Boolean, default: false },
    verifyToken: String
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const verifyToken = crypto.randomBytes(32).toString("hex");
        await User.create({ name, email, password, verifyToken });
        console.log("New signup:", name, email);

        const link = `http://localhost:3000/verify?token=${verifyToken}`;

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Verify your DevFlow account",
                html: `<p>Hi ${name},</p>
                       <p>Click the link below to verify your email:</p>
                       <p><a href="${link}">Verify my email</a></p>`
            });
            console.log("Verification email sent to", email);
        } catch (mailError) {
            console.log("Email failed:", mailError);
        }

        res.redirect("/dashboard.html");
    } catch (error) {
        console.log(error);
        res.status(500).send("Signup failed");
    }
});

app.get("/verify", async (req, res) => {
    const user = await User.findOne({ verifyToken: req.query.token });

    if (!user) {
        return res.status(400).send("Invalid or expired verification link");
    }

    user.verified = true;
    user.verifyToken = undefined;
    await user.save();
    console.log("Verified:", user.email);

    res.send("Email verified successfully. You can close this tab.");
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(3000, () => {
            console.log("DevFlow server running at http://localhost:3000");
        });
    })
    .catch((error) => {
        console.log("MongoDB connection failed:", error);
    });