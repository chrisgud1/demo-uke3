import express from "express";
import { Tree, Node } from "../data/tree.mjs";
const treeRouter = express.Router();

// Initialize tree with empty root node
const tree = Tree(Node(""));

// Parse JSON requests
treeRouter.use(express.json());

// Get entire tree
treeRouter.get("/", (req, res) => {
    try {
        // Return full tree structure
        res.status(200).json({
            success: true,
            tree: tree
        });
    } catch (error) {
        // Handle any errors
        res.status(500).json({
            success: false,
            error: "Failed to retrieve tree"
        });
    }
});

export default treeRouter;