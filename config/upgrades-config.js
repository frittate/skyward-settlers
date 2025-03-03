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
    // Maximum allowed of each type
    maxUpgrades: {
      'shelter': 1,     // Only one shelter
      'garden': 2,      // Up to 2 gardens
      'greenhouse': 1,  // Only one greenhouse
      'hydroponics': 1, // Only one hydroponics
      'collector': 3,   // Up to 3 rain collectors
      'barrels': 2,     // Up to 2 proper rain barrels
      'waterTank': 1    // Only one water tank
    }
  },
  
  // Upgrade types and their properties
  upgrades: {
    // Shelter upgrades - already implemented, included for reference
    'shelter': {
      name: "Shelter",
      description: "Improves living conditions and protection.",
      icon: "🏕️",
      category: "shelter",
      // Shelter levels defined in game-config.js
    },
    
    // Food production upgrades
    'garden': {
      name: "Rooftop Garden",
      description: "A small garden to grow basic food.",
      icon: "🌱",
      category: "food",
      prerequisites: [],  // No prerequisites
      levels: [
        {
          level: 1,
          name: "Basic Garden",
          description: "Simple planter boxes for growing food.",
          materialCost: 5,
          buildTime: 2,
          production: {
            min: 1,
            max: 2
          },
          hopeBonus: 5
        }
      ]
    },
    
    'greenhouse': {
      name: "Greenhouse",
      description: "A protected environment for growing more food.",
      icon: "🏡",
      category: "food",
      prerequisites: ['garden'],  // Requires garden first
      levels: [
        {
          level: 1,
          name: "Makeshift Greenhouse",
          description: "A small structure with recovered glass and plastic sheets.",
          materialCost: 15,
          buildTime: 4,
          production: {
            min: 3,
            max: 5
          },
          hopeBonus: 10
        }
      ]
    },
    
    'hydroponics': {
      name: "Hydroponics System",
      description: "Advanced system for growing food without soil.",
      icon: "🌿",
      category: "food",
      prerequisites: ['greenhouse'],  // Requires greenhouse first
      levels: [
        {
          level: 1,
          name: "Basic Hydroponics",
          description: "Water-based growing system for efficient food production.",
          materialCost: 25,
          buildTime: 6,
          production: {
            min: 5,
            max: 8
          },
          hopeBonus: 15
        }
      ]
    },
    
    // Water collection upgrades
    'collector': {
      name: "Rain Collector",
      description: "Collects rainwater for drinking.",
      icon: "💧",
      category: "water",
      prerequisites: [],  // No prerequisites
      levels: [
        {
          level: 1,
          name: "Basic Rain Collector",
          description: "Simple tarps and containers to collect rainwater.",
          materialCost: 5,
          buildTime: 1,
          production: {
            min: 1,
            max: 3
          },
          hopeBonus: 5
        }
      ]
    },
    
    'barrels': {
      name: "Rain Barrels",
      description: "Proper barrels for collecting and storing rainwater.",
      icon: "🛢️",
      category: "water",
      prerequisites: ['collector'],  // Requires collector first
      levels: [
        {
          level: 1,
          name: "Proper Rain Barrels",
          description: "Sealed barrels with filtration for efficient water collection.",
          materialCost: 12,
          buildTime: 3,
          production: {
            min: 3,
            max: 5
          },
          hopeBonus: 8
        }
      ]
    },
    
    'waterTank': {
      name: "Water Tank",
      description: "Large tank for collecting and storing significant amounts of water.",
      icon: "🚰",
      category: "water",
      prerequisites: ['barrels'],  // Requires barrels first
      levels: [
        {
          level: 1,
          name: "Rooftop Water Tank",
          description: "Large capacity tank with filtration system.",
          materialCost: 20,
          buildTime: 5,
          production: {
            min: 5,
            max: 10
          },
          hopeBonus: 12
        }
      ]
    }
  }
};