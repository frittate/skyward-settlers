// Settler class
class Settler {
  constructor(name, role, health = 100, morale = 100, wounded = false) {
    this.name = name;
    this.role = role;
    this.health = health;
    this.morale = morale;
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
      // Wounded settlers don't gain any benefits from rest
      return `${this.name} is wounded and cannot recover from resting.`;
    } else {
      // Resting doesn't automatically improve morale anymore
      return `${this.name} rested but gains no immediate benefits.`;
    }
  }
  
  // Apply health/morale changes from resource consumption
  updateWellbeing() {
    let changes = [];
    
    // Health effects from hunger - reduced penalties
    if (this.daysWithoutFood >= 1) {
      const oldHealth = this.health;
      const healthLoss = this.daysWithoutFood >= 3 ? 15 : 10; // Critical hunger after 3 days
      this.health = Math.max(0, this.health - healthLoss);
      if (oldHealth !== this.health) {
        changes.push(`health -${healthLoss} (now ${this.health})`);
      }
    }
    
    // Morale effects from thirst - unchanged
    if (this.daysWithoutWater >= 1) {
      const oldMorale = this.morale;
      const moraleLoss = this.daysWithoutWater >= 2 ? 30 : 20; // Critical thirst after 2 days
      this.morale = Math.max(0, this.morale - moraleLoss);
      if (oldMorale !== this.morale) {
        changes.push(`morale -${moraleLoss} (now ${this.morale})`);
      }
    }
    
    return changes.length > 0 ? changes.join(", ") : null;
  }
  
  // Update recovery status
  updateRecovery() {
    if (this.recovering) {
      this.recoveryDaysLeft--;
      
      if (this.recoveryDaysLeft <= 0) {
        this.recovering = false;
        return `${this.name} has fully recovered from their expedition and is ready for new assignments.`;
      } else {
        return `${this.name} is still recovering from expedition (${this.recoveryDaysLeft} days left).`;
      }
    }
    return null;
  }
  
  // Return a string representation of the settler
  toString() {
    let status = `${this.name} (${this.role}) - Health: ${this.health}, Morale: ${this.morale}`;
    if (this.wounded) {
      status += " [WOUNDED]";
    }
    if (this.recovering) {
      status += ` [RECOVERING - ${this.recoveryDaysLeft} days]`;
    }
    if (this.busy) {
      status += ` - Busy until day ${this.busyUntil}`;
    }
    return status;
  }
}

module.exports = Settler;