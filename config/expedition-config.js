module.exports = {
    expedition: {
        duration: {
            'small': {min: 2, max: 3},
            'medium': {min: 3, max: 5},
            'large': {min: 5, max: 7},
            'emergency': {min: 1, max: 1}
        },
        supplyCost: {
            'small': {food: 1, water: 1},
            'medium': {food: 2, water: 2},
            'large': {food: 3, water: 3},
            'emergency': {food: 0, water: 0}
        },
        recoverTime: {
            'small': 1,
            'medium': 2,
            'large': 3,
            'emergency': 1
        },
        successChance: {
            'small': 0.6,
            'medium': 0.7,
            'large': 0.8,
            'emergency': 0.3
        },
        survivorChance: {
            'small': 0.2,
            'medium': 0.3,
            'large': 0.4,
            'emergency': 0
        },
        resourceMultiplier: {
            'small': 1,
            'medium': 1.1,
            'large': 1.2
        },
        jackpotChance: 0.2,     // 20% per day
        delayChance: 0.05
    },
    expeditionResources: {
        // Instead of distribution and separate resourceChances, we define base min/max 
        // amounts for each resource. Food/water guaranteed (min>0). 
        baseAmounts: {
          food: {
            small: { min: 1, max: 2 },
            medium: { min: 2, max: 4 },
            large: { min: 3, max: 6 }
          },
          water: {
            small: { min: 1, max: 2 },
            medium: { min: 2, max: 4 },
            large: { min: 3, max: 6 }
          },
          meds: {
            small: { min: 0, max: 2 },
            medium: { min: 1, max: 3 },
            large: { min: 2, max: 4 }
          },
          materials: {
            small: { min: 0, max: 2 },
            medium: { min: 1, max: 3 },
            large: { min: 2, max: 4 }
          }
        },
        
        // Variability is still optional if you want it.
        // For example, you can keep it to ±25%
        variability: {
          min: 0.75,
          max: 1.25
        },
    
        // Emergency expedition config is still separate
        emergency: {
          food: { min: 1, max: 3 },
          water: { min: 1, max: 3 }
        }
      },     
}

