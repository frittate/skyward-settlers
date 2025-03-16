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

    // Get shelter config
    this.shelterConfig = gameConfig.shelter.tiers;
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
    return this.infrastructure.processDailyUpgrades();
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

  // Apply nightly exposure effects to settlers based on shelter level
  applyNightlyExposure(settlers) {
    if (this.infrastructure.infrastructure.shelter.level > 0) {
      return "Your settlement's shelter protects everyone during the night.";
    }

    const healthPenalty = 2; // -2 health per night
  
    // Apply penalty to all available settlers
    if (settlers.length === 0) {
      return "No settlers were affected by the elements.";
    }
    
    let effectsMessage = "";
    
    settlers.forEach(settler => {
      settler.health = Math.max(0, settler.health - healthPenalty);
      effectsMessage += `${settler.name} lost ${healthPenalty} health from sleeping exposed to the elements. Now at ${settler.health}. \n`;
    });
    
    return effectsMessage.trim();
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
}

module.exports = Settlement;