// config/resources-config.js
// Configuration for resources and resource generation

module.exports = { 
  // Resource consumption effects
  consumption: {
    // Health loss per day without food
    hungerEffects: {
      day1: 10,      // -10 health
      day3Plus: 15   // -15 health
    },
    
    // Morale loss per day without water
    thirstEffects: {
      day1: 15,      // -15 morale
      day2Plus: 25   // -25 morale
    }
  },
  
  // Resource stability bonuses
  stabilityBonus: {
    daysNeeded: 3,    // Days with sufficient resources for bonus
    moraleBonus: 5    // +5 morale for all settlers
  }
};