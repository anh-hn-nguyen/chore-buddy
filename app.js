// import { configDotenv } from "dotenv";
import express from "express";
// import { userRouter } from "./routes/users.js"
// import mongoose from "mongoose";
// import bcrypt from "bcrypt";
// import { User } from "./models/user.js";
// import jwt from "jsonwebtoken";
// import { configDotenv } from "dotenv";
// import { verifyToken } from "./auth.js";
// configDotenv();

// const PRIVATE_KEY = process.env.AUTH_PRIVATE_KEY;
// const MONGODB_URI = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// app.use(express.json());

// app.post("/signup", async function (req, res) {
//     const { username, password, firstName, lastName } = req.body;
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const newUser = new User({
//         username: username,
//         password: hashedPassword,
//         first_name: firstName,
//         last_name: lastName
//     });

//     const savedUser = await newUser.save();
//     res.status(201).json({
//         user_id: savedUser._id
//     });
// })

// app.post("/login", async function (req, res) {
//     const { username, password } = req.body;

//     const user = await User.findOne({
//         username: username,
//     });
//     if (!user) {
//         res.status(401).json({
//             error: "Authentication failed"
//         })
//     }
//     const passwordMatch = await bcrypt.compare(password, user.password);
//     if (!passwordMatch) {
//         res.status(401).json({
//             error: "Authentication failed"
//         })
//     }
//     const userObject = user.toObject();
//     delete userObject.password;
//     const token = jwt.sign(JSON.stringify(userObject), PRIVATE_KEY);
//     res.status(200).json({ token });
    
// })

// app.use("/users", verifyToken, userRouter);

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
})

// mongoose.connect(MONGODB_URI)
//     .then(() => console.log("successfully connected to db"))
//     .catch((err) => console.error(err));