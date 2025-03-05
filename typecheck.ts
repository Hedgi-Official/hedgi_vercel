import { NewHedge } from "./db/schema";

// Create a test object
const test: NewHedge = {
  userId: 1,
  baseCurrency: "USD",
  targetCurrency: "BRL",
  amount: "100.00", // Must be string for Drizzle decimal field
  rate: "3.75", // Must be string for Drizzle decimal field
  duration: 30,
  status: "active",
  tradeOrderNumber: 12345,
  tradeStatus: "ACTIVE",
};

console.log("Test object successfully created with the right types");