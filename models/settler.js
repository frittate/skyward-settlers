// models/settler.js
const resourcesConfig = require('../config/resources-config');

class Settler {
  constructor(name, role, health = 100, morale = 100, wounded = false) {
    this.name = name;
    this.role = role;
    this.health = health;
    this.morale = morale;
    this.activity = '';
    this.busy = false;
    this.busyUntil = 0;
    this.daysWithoutFood = 0;
    this.daysWithoutWater = 0;
    this.expedition = null;
    this.wounded = wounded; // Wounded status can only be healed with medicine
    this.recovering = false; // Recovering from expedition
    this.recoveryDaysLeft = 0; // Days left in recovery
  }

  // Check if settler can perform an activity
  canPerformActivity() {
    return !this.busy && this.health > 20;
  }

  // Assign a foraging expedition
  assignExpedition(radius, duration, returnDay) {
    if (this.canPerformActivity()) {
      this.busy = true;
      this.activity = 'expedition';
      this.busyUntil = returnDay;
      this.expedition = {
        settler: this,
        radius: radius,
        duration: duration,
        returnDay: returnDay
      };
      return true;
    }
    return false;
  }

  // Rest for a day
  rest() {
    if (this.wounded) {
      return `${this.name} is wounded and cannot recover from resting.`;
    } else {
      return `${this.name} rested but gains no immediate benefits.`;
    }
  }

  // Apply health/morale changes from resource consumption with hope mitigation
  updateWellbeing(hopeLevel = 0) {
    let changes = [];
    
    const consumptionEffects = resourcesConfig.consumption;

    // Calculate hope mitigation factor (0-50% reduction in penalties)
    const mitigation = Math.min(0.5, hopeLevel / 100);

    // Health effects from hunger - reduced penalties
    if (this.daysWithoutFood >= 1) {
      const oldHealth = this.health;
      // Determine penalty based on number of days without food
      let healthLoss = this.daysWithoutFood >= 3 
        ? consumptionEffects.hungerEffects.day3Plus 
        : consumptionEffects.hungerEffects.day1;

      // Apply hope mitigation
      healthLoss = Math.ceil(healthLoss * (1 - mitigation));

      this.health = Math.max(0, this.health - healthLoss);
      if (oldHealth !== this.health) {
        changes.push(`health -${healthLoss} (now ${this.health})`);
      }
    }

    // Morale effects from thirst - reduced penalties
    if (this.daysWithoutWater >= 1) {
      const oldMorale = this.morale;
      // Determine penalty based on number of days without water
      let moraleLoss = this.daysWithoutWater >= 2 
        ? consumptionEffects.thirstEffects.day2Plus 
        : consumptionEffects.thirstEffects.day1;

      // Apply hope mitigation
      moraleLoss = Math.ceil(moraleLoss * (1 - mitigation));

      this.morale = Math.max(0, this.morale - moraleLoss);
      if (oldMorale !== this.morale) {
        changes.push(`morale -${moraleLoss} (now ${this.morale})`);
      }
    }

    return changes.length > 0 ? changes.join(", ") : null;
  }

  // Update morale based on events
  updateMorale(amount, reason) {
    const oldMorale = this.morale;
    this.morale = Math.max(0, Math.min(100, this.morale + amount));
    
    if (oldMorale !== this.morale) {
      if (amount > 0) {
        return `${this.name}'s morale increased by ${amount} to ${this.morale} (${reason}). `;
      } else {
        return `${this.name}'s morale decreased by ${Math.abs(amount)} to ${this.morale} (${reason}).`;
      }
    } else if (amount !== 0) {
      return `${this.name}'s morale remains at ${this.morale} (${reason}).`;
    }
    
    return null;
  }

  // Update recovery status
  updateRecovery() {
    if (this.recovering) {
      this.recoveryDaysLeft--;

      if (this.recoveryDaysLeft <= 0) {
        this.recovering = false;
        return `${this.name} has fully recovered from their expedition and is ready for new assignments.`;
      } else {
        return `${this.name} is still recovering from expedition (${this.recoveryDaysLeft} day(s) left).`;
      }
    }
    return null;
  }

  // Apply healing with medicine
  heal(medicineAmount = 1, isMedic = false) {
    // Base healing amount
    let healingAmount = 15;
    
    // Bonus if healed by a medic
    if (isMedic) {
      healingAmount += 15;
    }
    
    const oldHealth = this.health;
    this.health = Math.min(100, this.health + healingAmount);
    
    // Cure wounded status from medics
    const wasWounded = this.wounded;
    if (isMedic) {
      this.wounded = false;
    }
    
    return {
      healthGained: this.health - oldHealth,
      newHealth: this.health,
      curedWound: wasWounded
    };
  }
  
  // Apply a morale boost
  boostMorale(amount) {
    const oldMorale = this.morale;
    this.morale = Math.min(100, this.morale + amount);
    return this.morale - oldMorale;
  }

  // Return a string representation of the settler
  toString() {
    // Basic info
    let status = `${this.name} (${this.role})`;

    if (!this.busy) {
      // Health and morale with details if low
      status += ` - Health: ${this.health}`;
      if (this.health < 50) status += " [POOR]";
      if (this.wounded) status += " [WOUNDED]";
      if (this.recovering) status += ` [RECOVERING: ${this.recoveryDaysLeft}d]`;
      
      status += `, Morale: ${this.morale}`;
      if (this.morale < 50) status += " [LOW]";
    }
    
    // Busy status
    if (this.busy) {
      let activity = "";
      
      if (this.activity === "infrastructure") {
        activity = "Building infrastructure";
        status += ` - BUSY: ${activity} until day ${this.busyUntil}`;
      } else if (this.activity === 'expedition') {
        activity = "On expedition";
        status += ` - BUSY: ${activity}.`
      }
    }
    
    return status;
  }
}

module.exports = Settler;