// settlement.js - Skyward Settlers
// Extended with Shelter System

const { formatResourceList, randomInt } = require('./utilities');

class Settlement {
  constructor() {
    this.resources = {
      food: 9,
      water: 9,
      meds: 1,
      materials: 0  // New resource for shelter building
    };
    
    // Track resource stability
    this.daysWithFood = 0;
    this.daysWithWater = 0;
    
    // Settlement hope system
    this.hope = 50; // Starting hope
    
    // Shelter system
    this.shelterTier = 0; // 0=Makeshift, 1=Tents, 2=Reinforced, 3=Permanent
    this.shelterName = ["Makeshift Camp", "Basic Tents", "Reinforced Shelters", "Permanent Settlement"];
    this.shelterProtection = [0.5, 0.75, 0.9, 1.0];
    this.shelterUpgradeCost = [0, 15, 30, 50]; // Materials needed for each tier
    this.shelterUpgradeDays = [0, 3, 5, 7]; // Days to complete each tier
    
    // Upgrade tracking
    this.upgradeInProgress = false;
    this.upgradeTimeLeft = 0;
    this.assignedMechanic = null;
  }
  
  // Add resources to the settlement
  addResource(type, amount) {
    if (this.resources[type] !== undefined) {
      this.resources[type] += amount;
      return true;
    }
    return false;
  }
  
  // Remove resources from the settlement
  removeResource(type, amount) {
    if (this.resources[type] !== undefined && this.resources[type] >= amount) {
      this.resources[type] -= amount;
      return true;
    }
    return false;
  }
  
  // Check if settlement has enough resources
  hasResources(resources) {
    for (const [type, amount] of Object.entries(resources)) {
      if (!this.resources[type] || this.resources[type] < amount) {
        return false;
      }
    }
    return true;
  }
  
  // Get current shelter name
  getShelterName() {
    return this.shelterName[this.shelterTier];
  }
  
  // Get shelter protection level (as percentage)
  getShelterProtection() {
    return Math.round(this.shelterProtection[this.shelterTier] * 100);
  }
  
  // Check if shelter can be upgraded
  canUpgradeShelter() {
    // Can't upgrade if already at max tier
    if (this.shelterTier >= this.shelterName.length - 1) {
      return { 
        possible: false, 
        reason: "Shelter is already at maximum tier." 
      };
    }
    
    // Can't upgrade if upgrade already in progress
    if (this.upgradeInProgress) {
      return { 
        possible: false, 
        reason: "Shelter upgrade already in progress." 
      };
    }
    
    // Check if we have enough materials
    const nextTier = this.shelterTier + 1;
    const materialsNeeded = this.shelterUpgradeCost[nextTier];
    
    if (this.resources.materials < materialsNeeded) {
      return { 
        possible: false, 
        reason: `Not enough materials. Need ${materialsNeeded}, have ${this.resources.materials}.`
      };
    }
    
    return { 
      possible: true,
      nextTier: nextTier,
      materialsNeeded: materialsNeeded,
      timeNeeded: this.shelterUpgradeDays[nextTier]
    };
  }
  
  // Start shelter upgrade
  startShelterUpgrade(mechanic) {
    const upgradeCheck = this.canUpgradeShelter();
    
    if (!upgradeCheck.possible) {
      return { success: false, message: upgradeCheck.reason };
    }
    
    // Consume materials
    const materialsNeeded = this.shelterUpgradeCost[this.shelterTier + 1];
    this.resources.materials -= materialsNeeded;
    
    // Set upgrade status
    this.upgradeInProgress = true;
    this.upgradeTimeLeft = this.shelterUpgradeDays[this.shelterTier + 1];
    this.assignedMechanic = mechanic;
    
    // Make mechanic busy
    mechanic.busy = true;
    mechanic.busyUntil = "shelter"; // Special marker for shelter duty
    
    const nextShelterName = this.shelterName[this.shelterTier + 1];
    
    return { 
      success: true, 
      message: `Started building ${nextShelterName}. Will take ${this.upgradeTimeLeft} days to complete.`,
      mechanic: mechanic.name,
      materials: materialsNeeded
    };
  }
  
  // Process daily upgrade progress
  processShelterUpgrade(settlers) {
    if (!this.upgradeInProgress) {
      return null;
    }
    
    this.upgradeTimeLeft--;
    
    // Check if upgrade is complete
    if (this.upgradeTimeLeft <= 0) {
      // Complete the upgrade
      this.shelterTier++;
      this.upgradeInProgress = false;
      
      // Release the mechanic
      if (this.assignedMechanic) {
        this.assignedMechanic.busy = false;
        this.assignedMechanic.busyUntil = 0;
      }
      
      // Give hope bonus for completing shelter tier
      let hopeBonus = 0;
      switch (this.shelterTier) {
        case 1: hopeBonus = 3; break;  // Basic Tents
        case 2: hopeBonus = 5; break; // Reinforced Shelters
        case 3: hopeBonus = 8; break; // Permanent Settlement
      }
      
      const shelterName = this.getShelterName();
      const hopeMessage = this.updateHope(hopeBonus, `completed ${shelterName}`);
      
      return {
        complete: true,
        shelterName: shelterName,
        shelterTier: this.shelterTier,
        hopeBonus: hopeBonus,
        hopeMessage: hopeMessage,
        mechanic: this.assignedMechanic ? this.assignedMechanic.name : "unknown"
      };
    }
    
    // Return progress update
    return {
      complete: false,
      daysLeft: this.upgradeTimeLeft,
      shelterName: this.shelterName[this.shelterTier + 1],
      mechanic: this.assignedMechanic ? this.assignedMechanic.name : "unknown"
    };
  }
  
  // Get shelter status summary
  getShelterStatus() {
    const status = {
      name: this.getShelterName(),
      tier: this.shelterTier,
      protection: this.getShelterProtection(),
      upgradeInProgress: this.upgradeInProgress
    };
    
    if (this.upgradeInProgress) {
      status.upgradeTimeLeft = this.upgradeTimeLeft;
      status.nextTier = this.shelterTier + 1;
      status.nextName = this.shelterName[this.shelterTier + 1];
    }
    
    return status;
  }
  
  // Check for effects from shelter quality (applied during weather events)
  applyShelterEffects(settlers, weatherType, weatherSeverity) {
    const shelterProtection = this.shelterProtection[this.shelterTier];
    const effects = [];
    
    // Calculate impact based on shelter protection and weather severity
    // Higher protection means less impact
    const impact = weatherSeverity * (1 - shelterProtection);
    
    // No significant impact if fully protected
    if (impact < 0.1) {
      effects.push("Your settlement is well protected from the weather.");
      return effects;
    }
    
    // Apply effects based on weather type and impact level
    switch (weatherType) {
      case 'rain':
        // Chance to collect water from rain (positive effect)
        const waterCollected = Math.floor(weatherSeverity * 2 * shelterProtection);
        if (waterCollected > 0) {
          this.addResource('water', waterCollected);
          effects.push(`Your settlement collected ${waterCollected} water from the rainfall.`);
        }
        
        // Negative effects if shelter is poor
        if (impact > 0.4) {
          // Chance for settlers to get sick
          for (const settler of settlers) {
            if (!settler.busy && Math.random() < impact * 0.5) {
              const healthLoss = Math.floor(impact * 10);
              if (healthLoss > 0) {
                settler.health = Math.max(0, settler.health - healthLoss);
                effects.push(`${settler.name} got sick from exposure to rain (-${healthLoss} health).`);
              }
            }
          }
          
          // Morale loss from discomfort
          const moraleLoss = Math.floor(impact * 5);
          if (moraleLoss > 0) {
            for (const settler of settlers) {
              if (!settler.busy) {
                settler.morale = Math.max(0, settler.morale - moraleLoss);
              }
            }
            effects.push(`Your settlers are uncomfortable in the rain (-${moraleLoss} morale).`);
          }
        }
        break;
        
      case 'wind':
        // Stronger negative effects for wind
        if (impact > 0.3) {
          // Damage to food supplies (spoilage from exposure)
          const foodLoss = Math.floor(impact * this.resources.food * 0.2);
          if (foodLoss > 0) {
            this.resources.food = Math.max(0, this.resources.food - foodLoss);
            effects.push(`Strong winds damaged your food supplies (-${foodLoss} food).`);
          }
          
          // Chance for settlers to get injured
          for (const settler of settlers) {
            if (!settler.busy && Math.random() < impact * 0.3) {
              const healthLoss = Math.floor(impact * 15);
              if (healthLoss > 0) {
                settler.health = Math.max(0, settler.health - healthLoss);
                effects.push(`${settler.name} was injured by flying debris (-${healthLoss} health).`);
              }
            }
          }
          
          // Shelter damage at lowest tier
          if (this.shelterTier === 0 && weatherSeverity > 0.7) {
            const hopeMessage = this.updateHope(-5, "shelter damage from strong winds");
            effects.push("Your makeshift shelters were damaged by the strong winds.");
            if (hopeMessage) effects.push(hopeMessage);
          }
        }
        break;
        
      case 'heat':
        // Heat increases water consumption
        const extraWaterNeeded = Math.ceil(impact * settlers.length * 0.5);
        if (extraWaterNeeded > 0) {
          effects.push(`The heat wave increases water needs (+${extraWaterNeeded} water needed).`);
          
          if (this.resources.water >= extraWaterNeeded) {
            this.resources.water -= extraWaterNeeded;
            effects.push(`Used ${extraWaterNeeded} extra water to keep settlers hydrated.`);
          } else {
            // Not enough water causes health issues
            const healthLoss = Math.floor(impact * 10);
            for (const settler of settlers) {
              if (!settler.busy) {
                settler.health = Math.max(0, settler.health - healthLoss);
              }
            }
            effects.push(`Not enough water during heat wave (-${healthLoss} health to all settlers).`);
          }
        }
        break;
        
      case 'cold':
        // Cold increases food consumption and can cause health issues
        const extraFoodNeeded = Math.ceil(impact * settlers.length * 0.5);
        if (extraFoodNeeded > 0) {
          effects.push(`The cold snap increases food needs (+${extraFoodNeeded} food needed).`);
          
          if (this.resources.food >= extraFoodNeeded) {
            this.resources.food -= extraFoodNeeded;
            effects.push(`Used ${extraFoodNeeded} extra food to keep settlers warm.`);
          } else {
            // Not enough food causes health and morale issues
            const healthLoss = Math.floor(impact * 8);
            const moraleLoss = Math.floor(impact * 10);
            
            for (const settler of settlers) {
              if (!settler.busy) {
                settler.health = Math.max(0, settler.health - healthLoss);
                settler.morale = Math.max(0, settler.morale - moraleLoss);
              }
            }
            
            effects.push(`Not enough food during cold snap (-${healthLoss} health, -${moraleLoss} morale).`);
          }
        }
        break;
    }
    
    return effects;
  }
  
  // Track resource stability for morale boosts
  trackResourceStability(settlers) {
    const allSettlersPresent = settlers.filter(s => !s.busy).length === settlers.length;
    
    // Check if we have enough food for everyone
    if (this.resources.food >= settlers.length) {
      this.daysWithFood++;
      // Boost morale after 3 consecutive days with sufficient food
      if (this.daysWithFood === 3 && allSettlersPresent) {
        settlers.forEach(settler => {
          settler.morale = Math.min(100, settler.morale + 5);
        });
        return "STABILITY BONUS: 3 days with sufficient food has improved morale (+5).";
      }
    } else {
      this.daysWithFood = 0;
    }
    
    // Check if we have enough water for everyone
    if (this.resources.water >= settlers.length) {
      this.daysWithWater++;
      // Boost morale after 3 consecutive days with sufficient water
      if (this.daysWithWater === 3 && allSettlersPresent) {
        settlers.forEach(settler => {
          settler.morale = Math.min(100, settler.morale + 5);
        });
        return "STABILITY BONUS: 3 days with sufficient water has improved morale (+5).";
      }
    } else {
      this.daysWithWater = 0;
    }
    
    return null;
  }
  
  // Update settlement hope based on events
  /* updateHope(amount, reason) {
    const oldHope = this.hope;
    this.hope = Math.max(0, Math.min(100, this.hope + amount));
    
    if (oldHope !== this.hope) {
      if (amount > 0) {
        return `Hope increased by ${amount} (${reason}). Settlement hope is now ${this.hope}.`;
      } else {
        return `Hope decreased by ${Math.abs(amount)} (${reason}). Settlement hope is now ${this.hope}.`;
      }
    }
    
    return null;
  } */
  
  // Calculate visitor chance based on hope
  getVisitorChance() {
    if (this.hope < 30) return 0;
    return Math.min(15, 5 + Math.floor(this.hope / 10));
  }
  
  // Get hope description and effects
  getHopeDescription() {
    const mitigationPercent = Math.min(50, Math.floor(this.hope / 2));
    let hopeDescription;
    
    if (this.hope >= 80) {
      hopeDescription = "Your settlers are inspired and optimistic about their future.";
    } else if (this.hope >= 60) {
      hopeDescription = "Your settlement has a positive atmosphere.";
    } else if (this.hope >= 40) {
      hopeDescription = "The mood in the settlement is cautiously hopeful.";
    } else if (this.hope >= 20) {
      hopeDescription = "Doubt and concern are spreading in the settlement.";
    } else {
      hopeDescription = "The settlement feels bleak and desperate.";
    }
    
    const effects = [
      hopeDescription,
      `Reduces health/morale penalties by ${mitigationPercent}%`
    ];
    
    // Display visitor chance if hope is high enough
    if (this.hope >= 30) {
      const visitorChance = this.getVisitorChance();
      effects.push(`${visitorChance}% daily chance of attracting visitors`);
    }
    
    return effects;
  }
  
  // Generate a random survivor/visitor
  generateVisitor(isMedic = false) {
    // Random visitor attributes
    const health = randomInt(40, 80);
    const morale = randomInt(50, 90);
    
    // Determine role with weighted probability
    const roleRoll = Math.random();
    let role;
    
    if (isMedic) {
      role = 'Medic';
    } else if (roleRoll < 0.60) {
      role = 'Generalist';
    } else if (roleRoll < 0.90) {
      role = 'Mechanic';
    } else {
      role = 'Medic';
    }
    
    // Generate a random name
    const survivorNames = [
      'Riley', 'Jordan', 'Taylor', 'Casey', 'Quinn', 'Avery', 
      'Blake', 'Drew', 'Jamie', 'Morgan', 'Rowan', 'Reese',
      'Skyler', 'Dakota', 'Kendall', 'Parker', 'Hayden', 'Finley'
    ];
    const name = survivorNames[Math.floor(Math.random() * survivorNames.length)];
    
    // Random gift (small amount of resources they bring)
    const gift = {
      food: Math.random() < 0.7 ? randomInt(1, 2) : 0,
      water: Math.random() < 0.7 ? randomInt(1, 2) : 0,
      meds: role === 'Medic' ? 1 : (Math.random() < 0.3 ? 1 : 0),  // Medics always bring 1 medicine
      materials: Math.random() < 0.4 ? randomInt(1, 3) : 0  // Sometimes bring materials
    };
    
    return { name, role, health, morale, gift };
  }
  
  // Format for display
  toString() {
    return `Settlement Resources: Food: ${this.resources.food}, Water: ${this.resources.water}, Meds: ${this.resources.meds}, Materials: ${this.resources.materials}
Settlement Hope: ${this.hope}
Shelter: ${this.getShelterName()} (${this.getShelterProtection()}% protection)
${this.upgradeInProgress ? `Upgrade in progress: ${this.upgradeTimeLeft} days remaining` : ''}`;
  }
}

module.exports = Settlement;
