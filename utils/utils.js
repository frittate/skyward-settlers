// utils/utils.js
// Utility functions for Skyward Settlers

// Print phase headers with decorative borders
function printPhaseHeader(title) {
  console.log("\n" + "=".repeat(title.length + 8));
  console.log(`=== ${title} ===`);
  console.log("=".repeat(title.length + 8));
}

// Generate a random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Format a resource list for display
function formatResourceList(resourceObj) {
  return Object.entries(resourceObj)
    .filter(([_, amount]) => amount > 0)
    .map(([resource, amount]) => `${amount} ${resource}`)
    .join(', ');
}

module.exports = {
  printPhaseHeader,
  randomInt,
  formatResourceList
};