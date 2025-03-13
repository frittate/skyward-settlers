module.exports = {
  // Chance of an event occurring based on radius (per day)
  eventChance: {
    'small': 0.2,  // 30% chance per day
    'medium': 0.3, // 50% chance per day
    'large': 0.4,  // 70% chance per day
    'emergency': 0.4 // 40% chance for emergency expeditions
  },
  
  // Probability distribution of event types by radius
  typeChance: {
    'small': {
      positive: 0.6,
      negative: 0.3,
      // neutral is the remainder (0.1)
    },
    'medium': {
      positive: 0.5,
      negative: 0.4,
      // neutral is the remainder (0.1)
    },
    'large': {
      positive: 0.4,
      negative: 0.5,
      // neutral is the remainder (0.1)
    },
    'emergency': {
      positive: 0.3,
      negative: 0.6,
      // neutral is the remainder (0.1)
    }
  }
};