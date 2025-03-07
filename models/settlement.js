// models/settlement.js
const { formatResourceList } = require('../utils/utils');
const gameConfig = require('../config/game-config');
const resourcesConfig = require('../config/resources-config');
const SettlementInfrastructure = require('./settlement-infrastructure');

class Settlement {
  constructor() {
    // Initialize resources from config
    this.resources = Object.fromEntries(
      Object.entries(gameConfig.starting)
        .map(([key, value]) => [key, value])
    );

    this.infrastructure = new SettlementInfrastructure();
    
    // Track resource stability
    this.resourceStability = {
      food: { days: 0 },
      water: { days: 0 }
    };
  }

  // === Resource Management ===
  modifyResource(type, amount) {
    if (this.resources[type] === undefined) return false;
    
    const newAmount = this.resources[type] + amount;
    if (newAmount < 0) return false;
    
    this.resources[type] = newAmount;
    return true;
  }

  addResource(type, amount) {
    return this.modifyResource(type, amount);
  }

  removeResource(type, amount) {
    return this.modifyResource(type, -amount);
  }

  hasResources(resources) {
    return Object.entries(resources)
      .every(([type, amount]) => 
        this.resources[type] && this.resources[type] >= amount
      );
  }

  // === Infrastructure Management ===
  getAvailableUpgrades() {
    return this.infrastructure.getAvailableUpgrades();
  }

  startInfrastructureUpgrade(category, mechanics) {
    return this.infrastructure.startUpgrade(category, mechanics);
  }

  processDailyInfrastructure() {
    const upgradeResults = this.infrastructure.processDailyUpgrades();
    const production = this.infrastructure.generateDailyResources();
    
    // Add production to resources
    Object.entries(production).forEach(([resource, amount]) => {
      this.addResource(resource, amount);
    });

    return { upgradeResults, production };
  }

  // === Resource Stability System ===
  trackResourceStability(settlers) {
    const allSettlersPresent = settlers.every(s => !s.busy);
    const config = resourcesConfig.stabilityBonus;
    
    const checkResourceStability = (resource) => {
      if (this.resources[resource] >= settlers.length) {
        this.resourceStability[resource].days++;
        
        if (this.resourceStability[resource].days === config.daysNeeded && allSettlersPresent) {
          settlers.forEach(settler => {
            settler.morale = Math.min(100, settler.morale + config.moraleBonus);
          });
          return `STABILITY BONUS: ${config.daysNeeded} days with sufficient ${resource} has improved morale (+${config.moraleBonus}).`;
        }
      } else {
        this.resourceStability[resource].days = 0;
      }
      return null;
    };

    // Check both food and water stability
    const foodMessage = checkResourceStability('food');
    const waterMessage = checkResourceStability('water');

    return foodMessage || waterMessage;
  }

  // === Hope System ===
  getHope(settlers) {
    if (!settlers?.length) return 50;

    const avgMorale = settlers.reduce((sum, s) => sum + s.morale, 0) / settlers.length;
    const cushionFactor = 10;
    const normalizedDistance = Math.abs(avgMorale - 50) / 50;
    const cushionAmount = cushionFactor * (1 - normalizedDistance);
    
    return Math.max(0, Math.min(100, Math.round(avgMorale + cushionAmount)));
  }

  getHopeDescription(hope) {
    const mitigationPercent = Math.min(50, Math.floor(hope / 2));
    const description = this.getHopeText(hope);

    const effects = [
      description,
      `Reduces health/morale penalties by ${mitigationPercent}%`
    ];

    const visitorChance = this.getVisitorChance(hope);
    if (visitorChance > 0) {
      effects.push(`${visitorChance}% daily chance of attracting visitors`);
    }

    return effects;
  }

  getHopeText(hope) {
    if (hope >= 80) return "Your settlers are inspired and optimistic about their future.";
    if (hope >= 60) return "Your settlement has a positive atmosphere.";
    if (hope >= 40) return "The mood in the settlement is cautiously hopeful.";
    if (hope >= 20) return "Doubt and concern are spreading in the settlement.";
    return "The settlement feels bleak and desperate.";
  }

  // === Visitor System ===
  getVisitorChance(hope) {
    return hope < 30 ? 0 : Math.min(15, 5 + Math.floor(hope / 10));
  }

  generateVisitor(isMedic = false) {
    // Implementation moved to a separate VisitorGenerator class
    return this.visitorGenerator.generate(isMedic);
  }

  // === Status Summary ===
  getShelterProtection() {
    return this.infrastructure.getShelterProtection();
  }

  getInfrastructureStatus() {
    return this.infrastructure.getInfrastructureSummary();
  }

  toString() {
    const resourcesList = Object.entries(this.resources)
      .map(([type, amount]) => `${type}: ${amount}`)
      .join(', ');
    
    return `Settlement Resources: ${resourcesList}
    Shelter: ${this.infrastructure.getShelterName()} (${this.getShelterProtection()}% protection)`;
  }
}

module.exports = Settlement;