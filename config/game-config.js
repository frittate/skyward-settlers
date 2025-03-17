// config/game-config.js
// Core game configuration parameters

module.exports = {
  // Starting conditions
  starting: {
    settlers: 3,
    food: 9,
    water: 9,
    meds: 1,
    materials: 3,
    hope: 50
  },
  // Hope system configuration
  hope: {
    // Events that affect settler hope
    hopeChange: {
      'successfulExpedition': 3,
      'jackpotFind': 1,
      'failedExpedition': -5,
      'newSettler': 10,
      'rescuedSurvivor': 10,
      'turnedAwaySurvivor': -8,
      'settlerDeath': -30,
      'settlerAbandonment': -20,
      'foodShortage': -3,
      'waterShortage': -3,
      'daySurvived': 2
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
        materialCost: 10,  // Reduced from 15 to 10
        buildTime: 2,      // Reduced from 3 to 2
        hopeBonus: 10      // Increased from 5 to 10
      },
      // Tier 2: Reinforced Shelters
      {
        name: "Reinforced Shelters",
        protection: 0.9,
        materialCost: 25,  // Reduced from 30 to 25
        buildTime: 4,      // Reduced from 5 to 4
        hopeBonus: 15      // Increased from 10 to 15
      },
      // Tier 3: Permanent Settlement
      {
        name: "Permanent Settlement",
        protection: 1.0,
        materialCost: 40,  // Reduced from 50 to 40
        buildTime: 6,      // Reduced from 7 to 6
        hopeBonus: 20      // Increased from 15 to 20
      }
    ]
  },

  // Survivor names
  survivorNames: [
    'Riley', 'Jordan', 'Taylor', 'Casey', 'Quinn', 'Avery', 
    'Blake', 'Drew', 'Jamie', 'Morgan', 'Rowan', 'Reese',
    'Skyler', 'Dakota', 'Kendall', 'Parker', 'Hayden', 'Finley', 'Sam'
  ],

  survivorRoleChances: {
    Medic: 0.4,
    Generalist: 0.2,
    Mechanic: 0.2
  },

  dailySurvivalMoraleBoost: 2
};
