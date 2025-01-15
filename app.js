import { configDotenv } from "dotenv";
import express from "express";
import { userRouter } from "./routes/users.js";
import mongoose from "mongoose";

import { verifyToken } from "./auth.js";
import { choreRouter } from "./routes/chores.js";
import { relationshipRouter } from "./routes/relationships.js";
configDotenv();

const MONGODB_URI = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

app.use(express.json());

app.use("/users", userRouter);
app.use("/chores", verifyToken, choreRouter);
app.use("/relationships", verifyToken, relationshipRouter);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("successfully connected to db"))
  .catch((err) => console.error(err));
