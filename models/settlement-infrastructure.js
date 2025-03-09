// models/settlement-infrastructure.js
const { randomInt } = require('../utils/utils');
const upgradesConfig = require('../config/upgrades-config');

class SettlementInfrastructure {
  constructor() {
    // Track built infrastructure by category and current level
    this.infrastructure = {
      shelter: { level: 0 }, // Shelter starts at level 0 (Makeshift Camp)
      food: { level: 1 },    // No food production initially
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
  
  // Get all available upgrade options based on current infrastructure
/*   getAvailableUpgrades() {
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
  
  // Start a new infrastructure upgrade
  startUpgrade(upgradeCategory, mechanics) {
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
      mechanic.busyUntil = "infrastructure"; // Special marker for infrastructure duty
    });
    
    return {
      success: true,
      message: `Started upgrading to ${upgrade.name}. Will take ${upgrade.timeLeft} days to complete.`,
      mechanics: upgrade.mechanics,
      adjustedBuildTime: adjustedBuildTime,
      originalBuildTime: selectedUpgrade.buildTime
    };
  }
  
  // Process daily infrastructure upgrades
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
    
    // Recalculate daily production after upgrades
    this.calculateDailyProduction();
    
    return {
      completed: completed,
      continuing: continuing
    };
  }
  
  // Update infrastructure level
  updateInfrastructureLevel(category, level) {
    if (this.infrastructure[category]) {
      this.infrastructure[category].level = level;
    } else {
      this.infrastructure[category] = { level: level };
    }
    
    // Recalculate daily production
    this.calculateDailyProduction();
  }
  
  // Get current level of a specific infrastructure category
  getInfrastructureLevel(category) {
    return this.infrastructure[category] ? this.infrastructure[category].level : 0;
  }
  
  // Calculate daily resource production
  calculateDailyProduction() {
    // Reset current production
    this.dailyProduction = {
      food: 0,
      water: 0
    };
    
    // Calculate for each infrastructure category
    for (const [category, info] of Object.entries(this.infrastructure)) {
      const config = upgradesConfig.upgrades[category];
      if (!config) continue;
      
      // Skip if level is 0 (no infrastructure built)
      if (info.level === 0) continue;
      
      // Get current tier details
      const tierDetails = config.tiers.find(t => t.level === info.level);
      if (!tierDetails || !tierDetails.production) continue;
      
      // Determine which resource this produces
      if (category === 'food' && tierDetails.production) {
        // Use minimum production for the daily estimate
        this.dailyProduction.food += tierDetails.production.min;
      } else if (category === 'water' && tierDetails.production) {
        // Use minimum production for the daily estimate
        this.dailyProduction.water += tierDetails.production.min;
      }
    }
    
    return this.dailyProduction;
  }
  
  // Generate daily resources based on infrastructure
  generateDailyResources() {
    const resources = {
      food: 0,
      water: 0
    };
    
    // Calculate for each infrastructure category
    for (const [category, info] of Object.entries(this.infrastructure)) {
      const config = upgradesConfig.upgrades[category];
      if (!config) continue;
      
      // Skip if level is 0 (no infrastructure built)
      if (info.level === 0) continue;
      
      // Get current tier details
      const tierDetails = config.tiers.find(t => t.level === info.level);
      if (!tierDetails || !tierDetails.production) continue;
      
      // Generate random amount within range
      if (category === 'food') {
        const amount = randomInt(tierDetails.production.min, tierDetails.production.max);
        resources.food += amount;
      } else if (category === 'water') {
        const amount = randomInt(tierDetails.production.min, tierDetails.production.max);
        resources.water += amount;
      }
    }
    
    return resources;
  }
  
  // Get current infrastructure summary
  getInfrastructureSummary() {
    const summary = [];
    
    for (const [category, info] of Object.entries(this.infrastructure)) {
      // Skip level 0 infrastructures (not built yet)
      if (info.level === 0) continue;
      
      const config = upgradesConfig.upgrades[category];
      if (!config) continue;
      
      // Get tier details
      const tierDetails = config.tiers.find(t => t.level === info.level);
      if (!tierDetails) continue;
      
      summary.push({
        category: category,
        name: tierDetails.name, // Just use the tier name directly
        level: info.level,
        icon: config.icon || (category === 'food' ? '🌱' : '💧'), // Default icons if none provided
        description: tierDetails.description,
        production: tierDetails.production,
        protection: tierDetails.protection // For shelter
      });
    }
    
    return summary;
  }
  
  // Get upgrades in progress summary
  getUpgradesInProgressSummary() {
    return this.upgradesInProgress.map(upgrade => ({
      category: upgrade.category,
      name: upgrade.name,
      level: upgrade.level,
      timeLeft: upgrade.timeLeft,
      originalTime: upgrade.originalTime,
      mechanics: upgrade.mechanics
    }));
  }
  
  // Get the protection level for the current shelter
  getShelterProtection() {
    const shelterLevel = this.getInfrastructureLevel('shelter');
    const shelterConfig = upgradesConfig.upgrades.shelter;
    
    if (!shelterConfig || !shelterConfig.tiers) return 0;
    
    const tierDetails = shelterConfig.tiers.find(t => t.level === shelterLevel);
    return tierDetails ? tierDetails.protection : 0;
  }
  
  // Check if a category has a upgrade in progress
  hasUpgradeInProgress(category) {
    return this.upgradesInProgress.some(upgrade => upgrade.category === category);
  }
  
  // Get max level for a category
  getMaxLevel(category) {
    const config = upgradesConfig.upgrades[category];
    if (!config || !config.tiers) return 0;
    
    // Find the highest level tier
    let maxLevel = 0;
    for (const tier of config.tiers) {
      if (tier.level > maxLevel) {
        maxLevel = tier.level;
      }
    }
    
    return maxLevel;
  }
  
  // Check if a category is at max level
  isAtMaxLevel(category) {
    const currentLevel = this.getInfrastructureLevel(category);
    const maxLevel = this.getMaxLevel(category);
    return currentLevel >= maxLevel;
  } */
}

module.exports = SettlementInfrastructure;