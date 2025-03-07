// models/settlement-infrastructure.js

const { randomInt } = require('../utils/utils');
const upgradesConfig = require('../config/upgrades-config');

class SettlementInfrastructure {
  constructor() {
    this.infrastructure = {
      shelter: { level: 0 },
      food: { level: 0 },
      water: { level: 0 }
    };
    
    this.upgradesInProgress = [];
    this.dailyProduction = {
      food: 0,
      water: 0
    };
  }

  // Core Infrastructure Methods
  getInfrastructureLevel(category) {
    return this.infrastructure[category]?.level || 0;
  }

  updateInfrastructureLevel(category, level) {
    if (!this.infrastructure[category]) {
      this.infrastructure[category] = { level: 0 };
    }
    this.infrastructure[category].level = level;
    this.calculateDailyProduction();
  }

  // Upgrade Management
  getAvailableUpgrades() {
    const available = [];
    
    for (const [category, categoryConfig] of Object.entries(upgradesConfig.upgrades)) {
      const currentLevel = this.getInfrastructureLevel(category);
      const nextLevel = currentLevel + 1;
      const nextTier = categoryConfig.tiers.find(tier => tier.level === nextLevel);
      
      if (nextTier) {
        available.push({
          category,
          name: `${categoryConfig.name} (${nextTier.name})`,
          level: nextLevel,
          description: nextTier.description,
          icon: categoryConfig.icon,
          materialCost: nextTier.materialCost,
          buildTime: nextTier.buildTime,
          production: nextTier.production,
          hopeBonus: nextTier.hopeBonus,
          protection: nextTier.protection
        });
      }
    }
    
    return available;
  }

  startUpgrade(upgradeCategory, mechanics) {
    const selectedUpgrade = this.getAvailableUpgrades()
      .find(u => u.category === upgradeCategory);

    if (!selectedUpgrade) {
      return {
        success: false,
        message: `Cannot upgrade ${upgradeCategory} - no further upgrades available.`
      };
    }

    if (this.hasUpgradeInProgress(upgradeCategory)) {
      return {
        success: false,
        message: `Cannot start upgrade - ${upgradeCategory} already has an upgrade in progress.`
      };
    }

    const mechanicCount = Math.min(mechanics.length, 4);
    const speedMultiplier = upgradesConfig.settings.mechanicSpeedBonus[mechanicCount] || 1.0;
    const adjustedBuildTime = Math.max(1, Math.floor(selectedUpgrade.buildTime / speedMultiplier));

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

    this.upgradesInProgress.push(upgrade);
    mechanics.forEach(mechanic => {
      mechanic.busy = true;
      mechanic.busyUntil = "infrastructure";
    });

    return {
      success: true,
      message: `Started upgrading to ${upgrade.name}. Will take ${upgrade.timeLeft} days to complete.`,
      mechanics: upgrade.mechanics,
      adjustedBuildTime,
      originalBuildTime: selectedUpgrade.buildTime
    };
  }

  processDailyUpgrades() {
    const completed = [];
    const continuing = [];

    for (const upgrade of this.upgradesInProgress) {
      upgrade.timeLeft--;

      if (upgrade.timeLeft <= 0) {
        completed.push(upgrade);
        this.updateInfrastructureLevel(upgrade.category, upgrade.level);
      } else {
        continuing.push(upgrade);
      }
    }

    this.upgradesInProgress = continuing;
    this.calculateDailyProduction();

    return { completed, continuing };
  }

  // Resource Production
  calculateDailyProduction() {
    this.dailyProduction = {
      food: 0,
      water: 0
    };

    for (const [category, info] of Object.entries(this.infrastructure)) {
      const config = upgradesConfig.upgrades[category];
      if (!config || info.level === 0) continue;

      const tierDetails = config.tiers.find(t => t.level === info.level);
      if (!tierDetails?.production) continue;

      if (category === 'food') {
        this.dailyProduction.food += tierDetails.production.min;
      } else if (category === 'water') {
        this.dailyProduction.water += tierDetails.production.min;
      }
    }

    return this.dailyProduction;
  }

  generateDailyResources() {
    const resources = {
      food: 0,
      water: 0
    };

    for (const [category, info] of Object.entries(this.infrastructure)) {
      const config = upgradesConfig.upgrades[category];
      if (!config || info.level === 0) continue;

      const tierDetails = config.tiers.find(t => t.level === info.level);
      if (!tierDetails?.production) continue;

      if (category === 'food' || category === 'water') {
        const amount = randomInt(
          tierDetails.production.min, 
          tierDetails.production.max
        );
        resources[category] += amount;
      }
    }

    return resources;
  }

  // Status & Summary Methods
  getInfrastructureSummary() {
    return Object.entries(this.infrastructure)
      .filter(([_, info]) => info.level > 0)
      .map(([category, info]) => {
        const config = upgradesConfig.upgrades[category];
        if (!config) return null;

        const tierDetails = config.tiers.find(t => t.level === info.level);
        if (!tierDetails) return null;

        return {
          category,
          name: tierDetails.name,
          level: info.level,
          icon: config.icon || (category === 'food' ? '🌱' : '💧'),
          description: tierDetails.description,
          production: tierDetails.production,
          protection: tierDetails.protection
        };
      })
      .filter(Boolean);
  }

  getShelterProtection() {
    const shelterLevel = this.getInfrastructureLevel('shelter');
    const shelterConfig = upgradesConfig.upgrades.shelter;

    if (!shelterConfig?.tiers) return 0;

    const tierDetails = shelterConfig.tiers.find(t => t.level === shelterLevel);
    return tierDetails?.protection || 0;
  }

  getShelterName() {
    const shelterLevel = this.getInfrastructureLevel('shelter');
    const tier = upgradesConfig.upgrades.shelter.tiers
      .find(t => t.level === shelterLevel);
    return tier?.name || "Makeshift Camp";
  }

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

  hasUpgradeInProgress(category) {
    return this.upgradesInProgress.some(upgrade => upgrade.category === category);
  }
}

module.exports = SettlementInfrastructure;