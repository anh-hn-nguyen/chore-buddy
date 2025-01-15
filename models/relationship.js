import mongoose from "mongoose";

const Schema = mongoose.Schema;

const RelationshipSchema = new Schema({
    parent: { type: Schema.Types.ObjectId, ref: "Chore", required: true },
    child: { type: Schema.Types.ObjectId, ref: "Chore", required: true },
});


export const Relationship = mongoose.model("Relationship", RelationshipSchema);