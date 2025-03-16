// models/settlement-infrastructure.js
const { randomInt } = require('../utils/utils');
const upgradesConfig = require('../config/upgrades-config');

class SettlementInfrastructure {
  constructor() {
    // Track built infrastructure by category and current level
    this.infrastructure = {
      shelter: { level: 0 }, // Shelter starts at level 0 (Makeshift Camp)
      food: { level: 0 },    // No food production initially
      water: { level: 0 }    // No water collection initially
    };

    // Track upgrades in progress
    this.upgradesInProgress = [];

    // Current resource production
    this.dailyProduction = {
      food: 0,
      water: 0
    };
  }

  toString() {
    let output = '';

    // Display shelter info
    const shelterLevel = this.infrastructure.shelter.level;
    const shelterConfig = upgradesConfig.upgrades.shelter.tiers[shelterLevel];
    output += `Shelter - ${shelterConfig.name}: ${shelterConfig.description}\n`;

    // Display food info
    const foodLevel = this.infrastructure.food.level;
    if (foodLevel === 0) {
      output += 'Food: No infrastructure\n';
    } else {
      const foodConfig = upgradesConfig.upgrades.food.tiers[foodLevel];
      let productionText = '';
      if (foodConfig.production) {
        productionText = ` (Produces between ${foodConfig.production.min} and ${foodConfig.production.max} food per day)`;
      }
      output += `Food - ${foodConfig.name}: ${foodConfig.description}${productionText}\n`;
    }

    // Display water info
    const waterLevel = this.infrastructure.water.level;
    if (waterLevel === 0) {
      output += 'Water: No infrastructure\n';
    } else {
      const waterConfig = upgradesConfig.upgrades.water.tiers[waterLevel];
      let productionText = '';
      if (waterConfig.production) {
        productionText = ` (Produces between ${waterConfig.production.min} and ${waterConfig.production.max} water per day)`;
      }
      output += `Water - ${waterConfig.name}: ${waterConfig.description}${productionText}`;
    }

    return output;
  }

  generateDailyResources() {
    const resources = {
      food: 0,
      water: 0,
      foodSource: '',
      waterSource: ''
    };
  
    // Check for food production
    const foodCategory = this.infrastructure.food;
    if (foodCategory && foodCategory.level > 0) {
      const foodConfig = upgradesConfig.upgrades.food;
      const foodTier = foodConfig.tiers[foodCategory.level];
      const foodAmount = randomInt(foodTier.production.min, foodTier.production.max);
      
      resources.food = foodAmount;
      resources.foodSource = foodTier.name; // Capture the food source (tier name)
    }
  
    // Check for water production
    const waterCategory = this.infrastructure.water;
    if (waterCategory && waterCategory.level > 0) {
      const waterConfig = upgradesConfig.upgrades.water;
      const waterTier = waterConfig.tiers[waterCategory.level];
      const waterAmount = randomInt(waterTier.production.min, waterTier.production.max);
      
      resources.water = waterAmount;
      resources.waterSource = waterTier.name; // Capture the water source (tier name)
    }
  
    return resources;
  }

  processDailyUpgrades() {
    const completed = [];
    const continuing = [];
    
    // Process each upgrade in progress
    for (const upgrade of this.upgradesInProgress) {
      upgrade.timeLeft--;
      
      if (upgrade.timeLeft <= 0) {
        // Upgrade is complete
        completed.push(upgrade);
        
        // Update infrastructure level
        this.updateInfrastructureLevel(upgrade.category, upgrade.level);
      } else {
        // Upgrade continues
        continuing.push(upgrade);
      }
    }
    
    // Update upgrades in progress
    this.upgradesInProgress = continuing;
    

    return {
      completed: completed,
      continuing: continuing
    };
  }

  updateInfrastructureLevel(category, level) {
    if (this.infrastructure[category]) {
      this.infrastructure[category].level = level;
    } else {
      this.infrastructure[category] = { level: level };
    }
  }

  getAvailableUpgrades() {
    const available = [];
    const config = upgradesConfig.upgrades;
    
    // Check each upgrade category
    for (const [category, categoryConfig] of Object.entries(config)) {
      // Get current level for this category
      const currentLevel = this.getInfrastructureLevel(category);
      
      // Check if we can upgrade to the next level
      const nextLevel = currentLevel + 1;
      
      // Get the tier details for the next level
      const nextTier = categoryConfig.tiers.find(tier => tier.level === nextLevel);
      
      // If a next tier exists, this is an available upgrade
      if (nextTier) {
        available.push({
          category: category,
          name: `${categoryConfig.name} (${nextTier.name})`,
          level: nextLevel,
          description: nextTier.description,
          icon: categoryConfig.icon,
          materialCost: nextTier.materialCost,
          buildTime: nextTier.buildTime,
          production: nextTier.production,
          hopeBonus: nextTier.hopeBonus,
          protection: nextTier.protection // For shelter upgrades
        });
      }
    }
    
    return available;
  }

  getInfrastructureLevel(category) {
    return this.infrastructure[category] ? this.infrastructure[category].level : 0;
  }

  hasUpgradeInProgress(category) {
    return this.upgradesInProgress.some(upgrade => upgrade.category === category);
  }

  startUpgrade(upgradeCategory, mechanics, currentDay) {
    // Get all available upgrades
    const availableUpgrades = this.getAvailableUpgrades();
    
    // Find the selected upgrade by category
    const selectedUpgrade = availableUpgrades.find(u => u.category === upgradeCategory);
    
    if (!selectedUpgrade) {
      return {
        success: false,
        message: `Cannot upgrade ${upgradeCategory} - no further upgrades available.`
      };
    }
    
    // Calculate build time based on number of mechanics
    const mechanicCount = Math.min(mechanics.length, 4); // Cap at 4 mechanics for calculation
    const speedMultiplier = upgradesConfig.settings.mechanicSpeedBonus[mechanicCount] || 1.0;
    
    // Round down but ensure at least 1 day
    const adjustedBuildTime = Math.max(1, Math.floor(selectedUpgrade.buildTime / speedMultiplier));
    
    // Create the upgrade in progress
    const upgrade = {
      category: selectedUpgrade.category,
      name: selectedUpgrade.name,
      level: selectedUpgrade.level,
      timeLeft: adjustedBuildTime,
      originalTime: adjustedBuildTime,
      mechanics: mechanics.map(m => m.name),
      materialCost: selectedUpgrade.materialCost,
      production: selectedUpgrade.production,
      hopeBonus: selectedUpgrade.hopeBonus,
      protection: selectedUpgrade.protection
    };
    
    // Add to upgrades in progress
    this.upgradesInProgress.push(upgrade);
    
    // Mark mechanics as busy
    mechanics.forEach(mechanic => {
      mechanic.busy = true;
      mechanic.activity = 'infrastructure';
      mechanic.busyUntil = (currentDay + upgrade.timeLeft);
    });
    
    return {
      success: true,
      message: `Started upgrading to ${upgrade.name}. Will take ${upgrade.timeLeft} days to complete.`,
      mechanics: upgrade.mechanics,
      adjustedBuildTime: adjustedBuildTime,
      originalBuildTime: selectedUpgrade.buildTime
    };
  }
}

module.exports = SettlementInfrastructure;