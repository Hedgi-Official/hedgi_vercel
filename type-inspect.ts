import { hedges, type NewHedge } from "./db/schema";

// Log the type info
console.log("Amount field type:", typeof hedges.amount);
console.log("Columns in hedges:", Object.keys(hedges));

// Try to create a typed object
const amount: (typeof hedges.amount._type) = "123.45";
console.log("Created with:", typeof amount, amount);

// Try with number
const amountNum: (typeof hedges.amount._type) = 123.45;
console.log("Created with number:", typeof amountNum, amountNum);