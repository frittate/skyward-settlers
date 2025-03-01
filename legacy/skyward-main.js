// Skyward Settlers - Main Game File
const readline = require('readline');
const Settler = require('./settler');
const Expedition = require('./expedition');
const EventSystem = require('./event-system');
const Settlement = require('./settlement');
const GameEngine = require('./game-engine');
const { printPhaseHeader } = require('./utilities');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function for input
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Introduction message
async function showIntroduction() {
  console.log("=== SKYWARD SETTLERS ===");
  console.log("A post-apocalyptic rooftop settlement simulation\n");
  
  printPhaseHeader("WELCOME TO THE ROOFTOPS");
  console.log("The world below is flooded and dangerous. Your small group of survivors");
  console.log("has found refuge on the rooftop of a tall building.");
  console.log("\nYou must scavenge for resources, manage your settlers' needs, and build");
  console.log("a sustainable settlement among the skyscrapers.");
  console.log("\nBe careful - resources are scarce, injuries can be deadly without");
  console.log("proper medical care, and survivors may abandon hope if their morale drops too low.");
  console.log("\nYour mechanic, Sam, is wounded and needs medical attention to recover fully.");
  console.log("Look for a medic in your travels, as they can use medicine to heal wounds.");
  
  await askQuestion("\nPress Enter to begin your survival journey...");
}

// Start the game
async function startGame() {
  await showIntroduction();
  
  const game = new GameEngine(rl, askQuestion);
  await game.start();
}

// Run the game
startGame();