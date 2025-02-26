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
    
    // Health effects from hunger
    if (this.daysWithoutFood >= 2) {
      const oldHealth = this.health;
      this.health = Math.max(0, this.health - 10);
      if (oldHealth !== this.health) {
        changes.push(`health -10 (now ${this.health})`);
      }
    }
    
    // Morale effects from thirst
    if (this.daysWithoutWater >= 1) {
      const oldMorale = this.morale;
      this.morale = Math.max(0, this.morale - 15);
      if (oldMorale !== this.morale) {
        changes.push(`morale -15 (now ${this.morale})`);
      }
    }
    
    return changes.length > 0 ? changes.join(", ") : null;
  }
  
  // Return a string representation of the settler
  toString() {
    let status = `${this.name} (${this.role}) - Health: ${this.health}, Morale: ${this.morale}`;
    if (this.wounded) {
      status += " [WOUNDED]";
    }
    if (this.busy) {
      status += ` - Busy until day ${this.busyUntil}`;
    }
    return status;
  }
}

module.exports = Settler;