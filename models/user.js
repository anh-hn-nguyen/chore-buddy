import mongoose from "mongoose";

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {type: String, required: true},
    password: { type: String, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String }
});

export const User = mongoose.model("User", UserSchema);