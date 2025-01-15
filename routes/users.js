import express from "express";
import { configDotenv } from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user.js";

configDotenv();

const PRIVATE_KEY = process.env.AUTH_PRIVATE_KEY;
const router = express.Router();

router.post("/signup", async function (req, res, next) {
    const { username, password, first_name, last_name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        username: username,
        password: hashedPassword,
        first_name: first_name,
        last_name: last_name
    });

    const savedUser = await newUser.save();
    res.status(201).json({
        id: savedUser._id
    });
});

router.post("/login", async function (req, res, next) {
    const { username, password } = req.body;

    console.log(username);
    console.log(password);
    const user = await User.findOne({
        username: username,
    });
    if (!user) {
        return res.status(401).json({
            error: "Authentication failed"
        })
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({
            error: "Authentication failed"
        })
    };
    const userObject = user.toObject();
    delete userObject.password;
    const token = jwt.sign(JSON.stringify(userObject), PRIVATE_KEY);
    res.status(200).json({ 
        first_name: user.first_name,
        last_name: user.last_name,
        token: token
    });
})

export const userRouter = router;