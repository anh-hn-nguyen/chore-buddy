import express from "express";
import { Chore } from "../models/chore.js";
import { Relationship } from "../models/relationship.js";
const router = express.Router();

router.get("/", async function (req, res, next) {
  const userId = req.userId;
  const totalCount = await Chore.countDocuments({ user: userId }).exec();
  const chores = await Chore.find({ user: userId }).exec();

  res.status(200).json({
    total_count: totalCount,
    items: chores,
  });
});

router.post("/", async function (req, res) {
  const userId = req.userId;
  const newChore = new Chore({
    name: req.body.name,
    description: req.body.description,
    user: userId,
  });
  const savedChore = await newChore.save();
  res.status(201).json({
    id: savedChore._id,
  });
});

router.put("/:choreId", async function (req, res) {
  const choreId = req.params.choreId;
  const { name, description } = req.body;

  await Chore.findByIdAndUpdate(choreId, {
    name: name,
    description: description,
  }).exec();
  res.status(204).end();
});

router.delete("/:choreId", async function (req, res, next) {
  const choreId = req.params.choreId;
  await Promise.all([
    Relationship.deleteMany({ parent: choreId }).exec(),
    Relationship.deleteMany({ child: choreId }).exec(),
    Chore.findByIdAndDelete(choreId).exec(),
  ]);

  res.status(204).end();
});

export const choreRouter = router;
