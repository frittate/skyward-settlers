// models/settlement.js
const { formatResourceList, randomInt } = require('../utils/utils');
const gameConfig = require('../config/game-config');
const resourcesConfig = require('../config/resources-config');
const SettlementInfrastructure = require('./settlement-infrastructure');

class Settlement {
  constructor() {
    this.resources = {
      food: gameConfig.starting.food,
      water: gameConfig.starting.water,
      meds: gameConfig.starting.meds,
      materials: gameConfig.starting.materials
    };

    this.infrastructure = new SettlementInfrastructure();

    // Track resource stability
    this.daysWithFood = 0;
    this.daysWithWater = 0;

    // Shelter system
    this.shelterTier = 0; // 0=Makeshift, 1=Tents, 2=Reinforced, 3=Permanent
    
    // Get shelter config
    this.shelterConfig = gameConfig.shelter.tiers;

    // Upgrade tracking
    this.upgradeInProgress = false;
    this.upgradeTimeLeft = 0;
    this.assignedMechanic = null;
  }

  getAvailableUpgrades() {
    return this.infrastructure.getAvailableUpgrades();
  }

  startInfrastructureUpgrade(upgradeType, mechanics) {
    // Check if we have enough materials
    const availableUpgrades = this.infrastructure.getAvailableUpgrades();
    const upgrade = availableUpgrades.find(u => u.type === upgradeType);
    
    if (!upgrade) {
      return { 
        success: false, 
        message: `${upgradeType} is not available for construction.` 
      };
    }
    
    // Check if we have enough materials
    if (this.resources.materials < upgrade.materialCost) {
      return { 
        success: false, 
        message: `Not enough materials. Need ${upgrade.materialCost}, have ${this.resources.materials}.` 
      };
    }
    
    // Consume materials
    this.resources.materials -= upgrade.materialCost;
    
    // Start the upgrade
    const result = this.infrastructure.startUpgrade(upgradeType, mechanics);
    
    return result;
  }

  processDailyProduction() {
    // Generate resources from infrastructure
    const production = this.infrastructure.generateDailyResources();
    
    // Add resources to settlement
    for (const [resource, amount] of Object.entries(production)) {
      if (amount > 0) {
        this.addResource(resource, amount);
      }
    }
    
    return production;
  }

  processInfrastructureUpgrades() {
    const result = this.infrastructure.processDailyUpgrades();
    
    // Free up mechanics from completed projects
    const completedProjects = result.completed;
    
    return result;
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
    return this.shelterConfig[this.shelterTier].name;
  }

  // Get shelter protection level (as percentage)
  getShelterProtection() {
    return Math.round(this.shelterConfig[this.shelterTier].protection * 100);
  }

  // Check if shelter can be upgraded
  canUpgradeShelter() {
    // Can't upgrade if already at max tier
    if (this.shelterTier >= this.shelterConfig.length - 1) {
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
    const materialsNeeded = this.shelterConfig[nextTier].materialCost;

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
      timeNeeded: this.shelterConfig[nextTier].buildTime
    };
  }

  // Start shelter upgrade
  startShelterUpgrade(mechanic) {
    const upgradeCheck = this.canUpgradeShelter();

    if (!upgradeCheck.possible) {
      return { success: false, message: upgradeCheck.reason };
    }

    // Consume materials
    const nextTier = this.shelterTier + 1;
    const materialsNeeded = this.shelterConfig[nextTier].materialCost;
    this.resources.materials -= materialsNeeded;

    // Set upgrade status
    this.upgradeInProgress = true;
    this.upgradeTimeLeft = this.shelterConfig[nextTier].buildTime;
    this.assignedMechanic = mechanic;

    // Make mechanic busy
    mechanic.busy = true;
    mechanic.busyUntil = "shelter"; // Special marker for shelter duty

    const nextShelterName = this.shelterConfig[nextTier].name;

    return { 
      success: true, 
      message: `Started building ${nextShelterName}. Will take ${this.upgradeTimeLeft} days to complete.`,
      mechanic: mechanic.name,
      materials: materialsNeeded
    };
  }

  // Process daily upgrade progress
  processShelterUpgrade() {
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
      const hopeBonus = this.shelterConfig[this.shelterTier].hopeBonus || 0;
      const shelterName = this.getShelterName();

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
      shelterName: this.shelterConfig[this.shelterTier + 1].name,
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
      status.nextName = this.shelterConfig[this.shelterTier + 1].name;
    }

    return status;
  }

  // Apply nightly exposure effects to settlers based on shelter level
  applyNightlyExposureEffects(settlers) {
    // Only apply if shelter tier is 0 (Makeshift Camp)
    if (this.shelterTier > 0) {
      return "Your settlement's shelter protects everyone during the night.";
    }
    
    const effects = [];
    const healthPenalty = 2; // -2 health per night
    
    // Apply penalty to all settlers who are present (not on expedition)
    for (const settler of settlers) {
      if (!settler.busy) {
        settler.health = Math.max(0, settler.health - healthPenalty);
        effects.push(`${settler.name} lost ${healthPenalty} health from sleeping exposed to the elements.`);
      }
    }
    
    return effects.length > 0 ? effects : "No settlers were affected by the elements.";
  }

  // Check for effects from shelter quality (applied during weather events)
  applyShelterEffects(settlers, weatherType, weatherSeverity) {
    const shelterProtection = this.shelterConfig[this.shelterTier].protection;
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
        // Wind specific effects implementation
        break;

      case 'heat':
        // Heat specific effects implementation
        break;

      case 'cold':
        // Cold specific effects implementation
        break;
    }

    return effects;
  }

  // Track resource stability for morale boosts
  trackResourceStability(settlers) {
    const allSettlersPresent = settlers.filter(s => !s.busy).length === settlers.length;
    const config = resourcesConfig.stabilityBonus;

    // Check if we have enough food for everyone
    if (this.resources.food >= settlers.length) {
      this.daysWithFood++;
      // Boost morale after consecutive days with sufficient food
      if (this.daysWithFood === config.daysNeeded && allSettlersPresent) {
        settlers.forEach(settler => {
          settler.morale = Math.min(100, settler.morale + config.moraleBonus);
        });
        return `STABILITY BONUS: ${config.daysNeeded} days with sufficient food has improved morale (+${config.moraleBonus}).`;
      }
    } else {
      this.daysWithFood = 0;
    }

    // Check if we have enough water for everyone
    if (this.resources.water >= settlers.length) {
      this.daysWithWater++;
      // Boost morale after consecutive days with sufficient water
      if (this.daysWithWater === config.daysNeeded && allSettlersPresent) {
        settlers.forEach(settler => {
          settler.morale = Math.min(100, settler.morale + config.moraleBonus);
        });
        return `STABILITY BONUS: ${config.daysNeeded} days with sufficient water has improved morale (+${config.moraleBonus}).`;
      }
    } else {
      this.daysWithWater = 0;
    }

    return null;
  }

  getHopeNew(settlers) {
    if (!settlers?.length) return 50;

    const avgMorale = settlers.reduce((sum, s) => sum + s.morale, 0) / settlers.length;
    const cushionFactor = 10;
    const normalizedDistance = Math.abs(avgMorale - 50) / 50;
    const cushionAmount = cushionFactor * (1 - normalizedDistance);
    
    return Math.max(0, Math.min(100, Math.round(avgMorale + cushionAmount)));
  }

  getHopeText(settlers) {
    const hope = this.getHopeNew(settlers)
    let hopeText = `Hope is ${hope}. `
    
    if (hope >= 80) {
      hopeText += "Your settlers are inspired and optimistic about their future.";
    } else if (hope >= 60) {
      hopeText += "Your settlement has a positive atmosphere.";
    } else if (hope >= 40) {
      hopeText += "The mood in the settlement is cautiously hopeful.";
    } else if (hope >= 20) {
      hopeText += "Doubt and concern are spreading in the settlement.";
    } else {
      hopeText += "The settlement feels bleak and desperate.";
    }
    
    return hopeText;
  }

  getHope(settlers) {
    // If there are no settlers, return a default value
    if (!settlers || settlers.length === 0) {
      return 50; // Default hope value when there are no settlers
    }
    
    // Calculate average morale
    const totalMorale = settlers.reduce((sum, settler) => sum + settler.morale, 0);
    const avgMorale = totalMorale / settlers.length;
    
    // Apply the smooth curve cushioning
    const cushionFactor = 10;
    
    // Calculate absolute distance from the midpoint (50), normalized to 0-1 range
    const normalizedDistance = Math.abs(avgMorale - 50) / 50;
    
    // Calculate the cushioning amount - maximum at center, tapering to 0 at extremes
    const cushionAmount = cushionFactor * (1 - normalizedDistance);
    
    // Apply the cushioning - boosting hope most at the middle range
    const calculatedHope = Math.round(avgMorale + cushionAmount);
    
    // Clamp the result to 0-100 range
    return Math.max(0, Math.min(100, calculatedHope));
  }
  
  // Calculate visitor chance based on hope
  getVisitorChance(hope) {
    if (hope < 30) return 0;
    return Math.min(15, 5 + Math.floor(hope / 10));
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

    const name = gameConfig.survivorNames[Math.floor(Math.random() * gameConfig.survivorNames.length)];

    // Random gift (small amount of resources they bring)
    const gift = {
      food: Math.random() < 0.7 ? randomInt(1, 2) : 0,
      water: Math.random() < 0.7 ? randomInt(1, 2) : 0,
      meds: role === 'Medic' ? 1 : (Math.random() < 0.3 ? 1 : 0),  // Medics always bring 1 medicine
      materials: Math.random() < 0.4 ? randomInt(1, 3) : 0  // Sometimes bring materials
    };

    return { name, role, health, morale, gift };
  }

    // Updated displayInfrastructureStatus method for Settlement class
  displayInfrastructureStatus() {
    const infrastructureSummary = this.infrastructure.getInfrastructureSummary();
    const upgradesInProgress = this.infrastructure.getUpgradesInProgressSummary();
    const statusLines = [];
    
    if (infrastructureSummary.length === 0 && upgradesInProgress.length === 0) {
      return ["No infrastructure has been built yet."];
    }
    
    // Display built infrastructure
    if (infrastructureSummary.length > 0) {
      statusLines.push("Built Infrastructure:");
      
      // Group by category
      const foodInfra = infrastructureSummary.filter(i => i.category === 'food');
      const waterInfra = infrastructureSummary.filter(i => i.category === 'water');
      
      if (foodInfra.length > 0) {
        statusLines.push("- Food Production:");
        for (const item of foodInfra) {
          statusLines.push(`  ${item.icon || '🌱'} ${item.name}: ${item.production.min}-${item.production.max} food/day`);
        }
      }
      
      if (waterInfra.length > 0) {
        statusLines.push("- Water Collection:");
        for (const item of waterInfra) {
          statusLines.push(`  ${item.icon || '💧'} ${item.name}: ${item.production.min}-${item.production.max} water/day`);
        }
      }
      
      // Show daily production totals
      const production = this.infrastructure.dailyProduction;
      if (production.food > 0 || production.water > 0) {
        statusLines.push("\nDaily Production:");
        if (production.food > 0) {
          statusLines.push(`- Food: ~${production.food} per day`);
        }
        if (production.water > 0) {
          statusLines.push(`- Water: ~${production.water} per day`);
        }
      }
    }
    
    // Display upgrades in progress
    if (upgradesInProgress.length > 0) {
      if (statusLines.length > 0) {
        statusLines.push(""); // Add space
      }
      statusLines.push("Upgrades In Progress:");
      for (const upgrade of upgradesInProgress) {
        const progress = Math.round(((upgrade.originalTime - upgrade.timeLeft) / upgrade.originalTime) * 100);
        statusLines.push(`- ${upgrade.name}: ${upgrade.timeLeft} days remaining (${progress}% complete)`);
        statusLines.push(`  Built by: ${upgrade.mechanics.join(', ')}`);
      }
    }
    
    return statusLines;
  }

  // Format for display
  toString() {
    return `Settlement Resources: Food: ${this.resources.food}, Water: ${this.resources.water}, Meds: ${this.resources.meds}, Materials: ${this.resources.materials}
Shelter: ${this.getShelterName()} (${this.getShelterProtection()}% protection)
${this.upgradeInProgress ? `Upgrade in progress: ${this.upgradeTimeLeft} days remaining` : ''}`;
  }
}

module.exports = Settlement;