// models/settlement-infrastructure.js
const { randomInt } = require('../utils/utils');
const upgradesConfig = require('../config/upgrades-config');

class SettlementInfrastructure {
  constructor() {
    // Track built infrastructure
    this.infrastructure = {
      // Format: { type: 'garden', level: 1, count: 1 }
    };
    
    // Track upgrades in progress
    this.upgradesInProgress = [];
    
    // Current resource production
    this.dailyProduction = {
      food: 0,
      water: 0
    };
  }
  
  // Get all available upgrade options based on current infrastructure
  getAvailableUpgrades() {
    const available = [];
    const config = upgradesConfig.upgrades;
    
    // Check each possible upgrade type
    for (const [type, upgrade] of Object.entries(config)) {
      // Skip shelter as it's handled separately
      if (type === 'shelter') continue;
      
      // Check if we've reached the maximum allowed for this type
      const existingCount = this.getInfrastructureCount(type);
      const maxAllowed = upgradesConfig.settings.maxUpgrades[type] || 1;
      
      if (existingCount >= maxAllowed) {
        continue;
      }
      
      // Check prerequisites
      const prereqsMet = upgrade.prerequisites.every(prereq => 
        this.getInfrastructureCount(prereq) > 0
      );
      
      if (prereqsMet) {
        // Get the correct level details
        const nextLevel = 1; // Currently only supporting level 1 for each type
        const levelDetails = upgrade.levels.find(l => l.level === nextLevel);
        
        if (levelDetails) {
          available.push({
            type: type,
            name: upgrade.name,
            level: nextLevel,
            description: levelDetails.description,
            icon: upgrade.icon,
            category: upgrade.category,
            materialCost: levelDetails.materialCost,
            buildTime: levelDetails.buildTime,
            production: levelDetails.production,
            hopeBonus: levelDetails.hopeBonus
          });
        }
      }
    }
    
    return available;
  }
  
  // Start a new infrastructure upgrade
  startUpgrade(upgradeType, mechanics) {
    const availableUpgrades = this.getAvailableUpgrades();
    const selectedUpgrade = availableUpgrades.find(u => u.type === upgradeType);
    
    if (!selectedUpgrade) {
      return {
        success: false,
        message: `Cannot build ${upgradeType} - prerequisites not met or maximum reached.`
      };
    }
    
    // Calculate build time based on number of mechanics
    const mechanicCount = Math.min(mechanics.length, 4); // Cap at 4 mechanics for calculation
    const speedMultiplier = upgradesConfig.settings.mechanicSpeedBonus[mechanicCount] || 1.0;
    
    // Round down but ensure at least 1 day
    const adjustedBuildTime = Math.max(1, Math.floor(selectedUpgrade.buildTime / speedMultiplier));
    
    // Create the upgrade in progress
    const upgrade = {
      type: selectedUpgrade.type,
      name: selectedUpgrade.name,
      level: selectedUpgrade.level,
      timeLeft: adjustedBuildTime,
      originalTime: adjustedBuildTime,
      mechanics: mechanics.map(m => m.name),
      materialCost: selectedUpgrade.materialCost,
      production: selectedUpgrade.production,
      hopeBonus: selectedUpgrade.hopeBonus
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
      message: `Started building ${upgrade.name}. Will take ${upgrade.timeLeft} days to complete.`,
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
        
        // Add to infrastructure
        this.addInfrastructure(upgrade.type, upgrade.level);
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
  
  // Add completed infrastructure
  addInfrastructure(type, level) {
    // Check if we already have this type
    const existing = this.infrastructure[type];
    
    if (existing) {
      existing.count += 1;
    } else {
      // Create new entry
      this.infrastructure[type] = {
        type: type,
        level: level,
        count: 1
      };
    }
    
    // Recalculate daily production
    this.calculateDailyProduction();
  }
  
  // Get count of a specific infrastructure type
  getInfrastructureCount(type) {
    return this.infrastructure[type] ? this.infrastructure[type].count : 0;
  }
  
  // Calculate daily resource production
  calculateDailyProduction() {
    // Reset current production
    this.dailyProduction = {
      food: 0,
      water: 0
    };
    
    // Calculate for each infrastructure
    for (const [type, info] of Object.entries(this.infrastructure)) {
      const config = upgradesConfig.upgrades[type];
      if (!config) continue;
      
      const levelDetails = config.levels.find(l => l.level === info.level);
      if (!levelDetails) continue;
      
      // Determine which resource this produces
      let resourceType = null;
      if (config.category === 'food') {
        resourceType = 'food';
      } else if (config.category === 'water') {
        resourceType = 'water';
      }
      
      if (resourceType && levelDetails.production) {
        // Add to daily production (min value for now, actual will vary)
        this.dailyProduction[resourceType] += levelDetails.production.min * info.count;
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
    
    // Calculate for each infrastructure type
    for (const [type, info] of Object.entries(this.infrastructure)) {
      const config = upgradesConfig.upgrades[type];
      if (!config) continue;
      
      const levelDetails = config.levels.find(l => l.level === info.level);
      if (!levelDetails || !levelDetails.production) continue;
      
      // Determine which resource this produces
      let resourceType = null;
      if (config.category === 'food') {
        resourceType = 'food';
      } else if (config.category === 'water') {
        resourceType = 'water';
      }
      
      if (resourceType) {
        // Generate random amount within range for each instance
        for (let i = 0; i < info.count; i++) {
          const amount = randomInt(levelDetails.production.min, levelDetails.production.max);
          resources[resourceType] += amount;
        }
      }
    }
    
    return resources;
  }
  
  // Get current infrastructure summary
  getInfrastructureSummary() {
    const summary = [];
    
    for (const [type, info] of Object.entries(this.infrastructure)) {
      const config = upgradesConfig.upgrades[type];
      if (!config) continue;
      
      const levelDetails = config.levels.find(l => l.level === info.level);
      if (!levelDetails) continue;
      
      summary.push({
        type: type,
        name: config.name,
        count: info.count,
        level: info.level,
        levelName: levelDetails.name,
        icon: config.icon,
        category: config.category,
        production: levelDetails.production
      });
    }
    
    return summary;
  }
  
  // Get upgrades in progress summary
  getUpgradesInProgressSummary() {
    return this.upgradesInProgress.map(upgrade => ({
      type: upgrade.type,
      name: upgrade.name,
      timeLeft: upgrade.timeLeft,
      originalTime: upgrade.originalTime,
      mechanics: upgrade.mechanics
    }));
  }
}

module.exports = SettlementInfrastructure;