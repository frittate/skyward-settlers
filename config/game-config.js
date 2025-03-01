// config/game-config.js
// Core game configuration parameters

module.exports = {
  // Starting conditions
  starting: {
    settlers: 3,
    food: 9,
    water: 9,
    meds: 1,
    materials: 0,
    hope: 50
  },
  
  // Expedition configuration
  expedition: {
    // Duration ranges by radius
    duration: {
      'small': {min: 2, max: 3},
      'medium': {min: 3, max: 5},
      'large': {min: 5, max: 7},
      'emergency': {min: 1, max: 1}
    },
    
    // Supply costs by radius
    supplyCost: {
      'small': {food: 1, water: 1},
      'medium': {food: 2, water: 2},
      'large': {food: 3, water: 3},
      'emergency': {food: 0, water: 0}
    },
    
    // Recovery time needed after expedition
    recoverTime: {
      'small': 1,
      'medium': 2,
      'large': 3,
      'emergency': 1
    },
    
    // Success chance varies by radius
    successChance: {
      'small': 0.7,   // 30% chance of failure
      'medium': 0.6,  // 40% chance of failure
      'large': 0.5,   // 50% chance of failure
      'emergency': 0.3 // 70% chance of failure
    },
    
    // Survivor discovery chance by radius
    survivorChance: {
      'small': 0.05,  // 5% chance
      'medium': 0.10, // 10% chance
      'large': 0.15,  // 15% chance
      'emergency': 0  // No chance
    },
    
    // Multipliers for resource returns
    resourceMultiplier: {
      'small': 2,     // 1.5-2.5x return
      'medium': 3,    // 2-4x return 
      'large': 4.5    // 3-6x return
    },
    
    // Chance for jackpot finds (exceptional resources)
    jackpotChance: 0.15, // 15% chance
    
    // Chance for expedition delay
    delayChance: 0.05    // 5% chance
  },
  
  // Hope system configuration
  hope: {
    // Events that affect settlement hope
    hopeChange: {
      'successfulExpedition': 10,
      'exceptionalFind': 15,
      'failedExpedition': -5,
      'newSettler': 15,
      'rescuedSurvivor': 20,
      'turnedAwaySurvivor': -5,
      'settlerDeath': -20,
      'settlerAbandonment': -15,
      'foodShortage': -3,
      'waterShortage': -3,
      'daySurvived': 3
    }
  },
  
  // Shelter system configuration
  shelter: {
    tiers: [
      // Tier 0: Makeshift Camp
      {
        name: "Makeshift Camp",
        protection: 0.5,
        materialCost: 0
      },
      // Tier 1: Basic Tents
      {
        name: "Basic Tents", 
        protection: 0.75,
        materialCost: 15,
        buildTime: 3,
        hopeBonus: 5
      },
      // Tier 2: Reinforced Shelters
      {
        name: "Reinforced Shelters",
        protection: 0.9,
        materialCost: 30,
        buildTime: 5,
        hopeBonus: 10
      },
      // Tier 3: Permanent Settlement
      {
        name: "Permanent Settlement",
        protection: 1.0,
        materialCost: 50,
        buildTime: 7,
        hopeBonus: 15
      }
    ]
  }
};