// config/upgrades-config.js
// Configuration for settlement upgrade systems

module.exports = {
  // General settings
  settings: {
    // Speed bonus for multiple mechanics
    mechanicSpeedBonus: {
      1: 1.0,     // 1 mechanic = normal speed (multiplier of 1.0)
      2: 1.6,     // 2 mechanics = 1.6x speed (40% faster)
      3: 2.5,     // 3 mechanics = 2.5x speed (60% faster)
      4: 3.0      // 4+ mechanics = 3.0x speed (70% faster)
    },
  },
  
  // Upgrade types and their properties
  upgrades: {
    // Shelter upgrades - already implemented, included for reference
    'shelter': {
      name: "Shelter",
      description: "Improves living conditions and protection.",
      icon: "🏕️",
      category: "shelter",
      tiers: [
        // Tier 0: Makeshift Camp
        {
          level: 0,
          name: "Makeshift Camp",
          description: "A temporary shelter with minimal protection.",
          protection: 0.5,
          materialCost: 0
        },
        // Tier 1: Basic Tents
        {
          level: 1,
          name: "Basic Tents", 
          protection: 0.75,
          description: "A number of basic tents with improved protection.",
          materialCost: 6,  // Reduced from 15 to 10
          buildTime: 2,      // Reduced from 3 to 2
          hopeBonus: 10      // Increased from 5 to 10
        },
        // Tier 2: Reinforced Shelters
        {
          level: 2,
          name: "Reinforced Shelters",
          description: "Shelters with reinforced walls and roofs.",
          protection: 0.9,
          materialCost: 12,
          buildTime: 4,      // Reduced from 5 to 4
          hopeBonus: 15      // Increased from 10 to 15
        },
        // Tier 3: Permanent Settlement
        {
          level: 3,
          name: "Permanent Settlement",
          description: "A permanent settlement with strong protection.",
          protection: 1.0,
          materialCost: 24,  // Reduced from 50 to 40
          buildTime: 6,      // Reduced from 7 to 6
          hopeBonus: 20      // Increased from 15 to 20
        }
      ]
    },
    'food': {
      name: "Food Production",
      description: "Upgrades to increase food production.",
      category: "food",
      icon: '',
      tiers: [
        {
          level: 0,
          name: "No Food Production",
          description: "No food production system.",
        },
        {
          level: 1,
          name: "Patch of dirt",
          description: "A small patch of dirt to grow basic food and fungi.",
          materialCost: 5,
          buildTime: 3,
          production: {
            min: 1,
            max: 2
          },
          hopeBonus: 5
        },
       {
        level: 2,
        name: "Rooftop Garden",
        description: "A small garden to grow basic food.",
        materialCost: 10,
        buildTime: 4,
        production: {
          min: 3,
          max: 4
        },
        hopeBonus: 10
      },
      {
        level: 3,
        name: "Hydroponic Setup",
        description: "A water-efficient setup for growing food.",
        materialCost: 20,
        buildTime: 5,
        production: {
          min: 5,
          max: 8
        },
        hopeBonus: 15
      },
      {
        level: 4,
        name: "Greenhouse",
        description: "A protected environment for growing more food.",
        materialCost: 30,
        buildTime: 6,
        production: {
          min: 10,
          max: 15
        },
        hopeBonus: 20
      }
      ]
    },
    'water': {
      name: 'Water',
      description: "Upgrade your shelter to collect and store water.",
      icon: "💦",
      category: "water",
      prerequisites: [],  // No prerequisites
      tiers: [
        {
          level: 0,
          name: "No Water Collection",
          description: "No water collection system.",
        },
        {
          level: 1,
          name: "Basic Water Collection",
          description: "Simple buckets to collect and store water.",
          materialCost: 5,
          buildTime: 2,
          production: {
            min: 1,
            max: 3
          },
          hopeBonus: 5
        },
        {
          level: 2,
          name: "Water Tank",
          description: "Tanks to store more water.",
          materialCost: 10,
          buildTime: 3,
          production: {
            min: 3,
            max: 6
          },
          hopeBonus: 10
        },
        {
          level: 3,
          name: "Water Purifier",
          description: "A system to purify water for drinking.",
          materialCost: 15,
          buildTime: 4,
          production: {
            min: 6,
            max: 9
          },
          hopeBonus: 15
        },
        {
          level: 4,
          name: "Rainwater Harvesting",
          description: "Advanced systems to collect rainwater.",
          materialCost: 20,
          buildTime: 5,
          production: {
            min: 9,
            max: 15
          },
          hopeBonus: 20
        }
      ]
    },
  }
};