// config/resources-config.js
// Configuration for resources and resource generation

module.exports = {
  // Resource distribution for expeditions
  expeditionResources: {
    // Base distribution percentages
    distribution: {
      food: 0.35,    // 35% of resources as food
      water: 0.35,   // 35% of resources as water
      meds: 0.15,     // 15% of resources as medicine (when available)
      materials: 0.15 // 15% of resources as materials (when available)
      // Add new resource types here with their distribution percentages
    },
    
    // Resource chances by radius and type
    resourceChances: {
      'food': { 'small': 1.0, 'medium': 1.0, 'large': 1.0 },
      'water': { 'small': 1.0, 'medium': 1.0, 'large': 1.0 },
      'meds': { 'small': 0.3, 'medium': 0.4, 'large': 0.6 },
      'materials': { 'small': 0.3, 'medium': 0.2, 'large': 0.4 }
      // Add new resource types here with their chances by radius
    },
    
    // Resource amounts by radius and type (base amounts)
    resourceAmounts: {
      'meds': { 'small': { min: 0, max: 2 }, 'medium': { min: 1, max: 3 }, 'large': { min: 2, max: 4 } },
      'materials': { 'small': { min: 0, max: 3 }, 'medium': { min: 2, max: 4 }, 'large': { min: 2, max: 6 } }
      // Define custom ranges for resources that don't use the standard distribution formula
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
      // Define emergency expedition resources for each type
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