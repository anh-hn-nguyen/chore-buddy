import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ChoreSchema = new Schema({
    name: { type: String, required: true, uniqued: true},
    description: String,
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }
});

export const Chore = mongoose.model("Chore", ChoreSchema);