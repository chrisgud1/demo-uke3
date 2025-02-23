import { console } from "inspector";
import { Node, Tree, saveTree } from "../data/tree.mjs"
import fs from "fs/promises"

//#region DUMMY data --------------------

let treeData = await fs.readFile("./init/dummy/tree1.json");
console.log(treeData);

// Create nodes
const nodeA = Node("A");
const nodeB = Node("B");
const rootNode = Node("Root", nodeA, nodeB);

// Create tree with root node
const myTree = Tree(rootNode);

// Save tree to JSON string
const savedTree = saveTree(myTree);

//#endregion


// Start server ----------
const server = await import("../server.mjs")