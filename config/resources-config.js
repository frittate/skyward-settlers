// config/resources-config.js
// Configuration for resources and resource generation

module.exports = {
  // Resource distribution for expeditions
  expeditionResources: {
    // Base distribution percentages
    distribution: {
      food: 0.4,    // 40% of resources as food
      water: 0.4,   // 40% of resources as water
      meds: 0.1,     // 20% of resources as medicine
      materials: 0.1
    },
    
    // Medicine availability by radius
    medicineChance: {
      'small': 0.0,   // No medicine in small radius
      'medium': 0.4,  // 40% chance in medium radius
      'large': 0.6    // 60% chance in large radius
    },
    
    // Variability in resource returns
    variability: {
      min: 0.75,    // -25% variability
      max: 1.25     // +25% variability
    },
    
    // Emergency expedition resources (if successful)
    emergency: {
      food: {min: 1, max: 3},
      water: {min: 1, max: 3}
    }
  },
  
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