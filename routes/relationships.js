import { Relationship } from "../models/relationship.js";
import express from "express";

const router = express.Router();

router.get("/", async function (req, res, next) {
  const count = await Relationship.countDocuments({}).exec();
  const items = await Relationship.find({}).exec();

  res.status(200).json({
    total_count: count,
    items: items,
  });
});

router.post("/", async function (req, res, next) {
  const { parent, child } = req.body;

  const newItem = new Relationship({
    parent: parent,
    child: child,
  });

  const savedItem = await newItem.save();
  res.status(201).json({
    id: savedItem._id,
  });
});

// get all relationships with parent = parentId
router.get("/parents/:parentId", async function (req, res, next) {
    const parentId = req.params;
    const [ totalCount, items ] = Promise.all([
        Relationship.countDocuments({ parent: parentId }).exec(),
        Relationship.find({ parent: parentId }).exec()
    ]);

    res.status(200).json({
        total_count: totalCount,
        items: items
    })
});

// get all relationships with child = childId
// router.get("/children/:childId");

router.delete("/parents/:parentId/children/:childId", async function (req, res, next) {
    const { parentId, childId } = req.params;
    await Relationship.deleteOne({
        parent: parentId,
        child: childId
    }).exec();
    res.status(204).end();
});

export const relationshipRouter = router;