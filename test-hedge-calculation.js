#!/usr/bin/env node

// Sample hedge cost calculation using actual ActivTrades data
console.log('=== HEDGE COST CALCULATION SAMPLE ===\n');

// Input parameters (example values)
const amount = 10000; // $10,000 USD
const tradeDirection = 'buy'; // buying BRL with USD
const businessDays = 7; // 7 business days
const wednesdays = 1; // 1 Wednesday in the period

console.log('INPUT PARAMETERS:');
console.log(`Amount: $${amount.toLocaleString()} USD`);
console.log(`Trade Direction: ${tradeDirection} (buying BRL)`);
console.log(`Business Days: ${businessDays}`);
console.log(`Wednesdays: ${wednesdays}`);
console.log('');

// Fetch current ActivTrades data
fetch('http://localhost:5000/api/activtrades-rate?symbol=USDBRL')
  .then(response => response.json())
  .then(data => {
    console.log('ACTIVTRADES DATA:');
    console.log(`Ask Rate: ${data.ask}`);
    console.log(`Bid Rate: ${data.bid}`);
    console.log(`Swap Long: ${data.swap_long}`);
    console.log(`Swap Short: ${data.swap_short}`);
    console.log('');

    // Calculate hedge cost using the actual formula
    const currentRate = {
      bid: data.bid,
      ask: data.ask
    };
    
    const swapValues = {
      swapLong: data.swap_long,
      swapShort: data.swap_short
    };

    // Step 1: Calculate spread cost
    const spreadCost = (currentRate.ask - currentRate.bid) * amount;
    console.log('CALCULATION STEPS:');
    console.log(`1. Spread Cost = (Ask - Bid) × Amount`);
    console.log(`   = (${currentRate.ask} - ${currentRate.bid}) × ${amount}`);
    console.log(`   = ${(currentRate.ask - currentRate.bid).toFixed(5)} × ${amount}`);
    console.log(`   = $${spreadCost.toFixed(2)}`);
    console.log('');

    // Step 2: Calculate volume in lots
    const volumeInLots = amount / 100000;
    console.log(`2. Volume in Lots = Amount ÷ 100,000`);
    console.log(`   = ${amount} ÷ 100,000`);
    console.log(`   = ${volumeInLots} lots`);
    console.log('');

    // Step 3: Calculate swap cost
    const swapRate = tradeDirection === 'buy' ? swapValues.swapLong : swapValues.swapShort;
    const swapCost = Math.abs(volumeInLots * swapRate * (businessDays + wednesdays*2) * 1.1);
    
    console.log(`3. Swap Cost = Volume × SwapRate × (BusinessDays + Wednesdays×2) × 1.1`);
    console.log(`   = ${volumeInLots} × ${swapRate} × (${businessDays} + ${wednesdays}×2) × 1.1`);
    console.log(`   = ${volumeInLots} × ${swapRate} × ${businessDays + wednesdays*2} × 1.1`);
    console.log(`   = ${volumeInLots * swapRate * (businessDays + wednesdays*2)} × 1.1`);
    console.log(`   = $${swapCost.toFixed(2)}`);
    console.log('');

    // Step 4: Total hedge cost
    const totalHedgeCost = swapCost + spreadCost;
    console.log(`4. Total Hedge Cost = Swap Cost + Spread Cost`);
    console.log(`   = $${swapCost.toFixed(2)} + $${spreadCost.toFixed(2)}`);
    console.log(`   = $${totalHedgeCost.toFixed(2)}`);
    console.log('');

    // Step 5: Cost percentage
    const rate = tradeDirection === 'buy' ? currentRate.ask : currentRate.bid;
    const costPercentage = (totalHedgeCost / amount / rate) * 100;
    console.log(`5. Cost Percentage = (Total Cost ÷ Amount ÷ Rate) × 100`);
    console.log(`   = ($${totalHedgeCost.toFixed(2)} ÷ ${amount} ÷ ${rate}) × 100`);
    console.log(`   = ${costPercentage.toFixed(4)}%`);
    console.log('');

    console.log('FINAL RESULT:');
    console.log(`Hedge Cost: $${totalHedgeCost.toFixed(2)} USD`);
    console.log(`Cost Percentage: ${costPercentage.toFixed(4)}%`);
    console.log(`Rate Used: ${rate} (${tradeDirection === 'buy' ? 'ask' : 'bid'})`);
    
  })
  .catch(error => {
    console.error('Error fetching ActivTrades data:', error);
  });