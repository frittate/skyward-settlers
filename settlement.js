// settlement.js - Skyward Settlers
// This class manages the settlement state, resources, hope system, and settlers

const { formatResourceList, randomInt } = require('./utilities');

class Settlement {
  constructor() {
    this.resources = {
      food: 9,
      water: 9,
      meds: 1
    };
    
    // Track resource stability
    this.daysWithFood = 0;
    this.daysWithWater = 0;
    
    // Settlement hope system
    this.hope = 50; // Starting hope
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
  
  // Track resource stability for morale boosts
  trackResourceStability(settlers) {
    const allSettlersPresent = settlers.filter(s => !s.busy).length === settlers.length;
    
    // Check if we have enough food for everyone
    if (this.resources.food >= settlers.length) {
      this.daysWithFood++;
      // Boost morale after 3 consecutive days with sufficient food
      if (this.daysWithFood === 3 && allSettlersPresent) {
        settlers.forEach(settler => {
          settler.morale = Math.min(100, settler.morale + 5);
        });
        return "STABILITY BONUS: 3 days with sufficient food has improved morale (+5).";
      }
    } else {
      this.daysWithFood = 0;
    }
    
    // Check if we have enough water for everyone
    if (this.resources.water >= settlers.length) {
      this.daysWithWater++;
      // Boost morale after 3 consecutive days with sufficient water
      if (this.daysWithWater === 3 && allSettlersPresent) {
        settlers.forEach(settler => {
          settler.morale = Math.min(100, settler.morale + 5);
        });
        return "STABILITY BONUS: 3 days with sufficient water has improved morale (+5).";
      }
    } else {
      this.daysWithWater = 0;
    }
    
    return null;
  }
  
  // Update settlement hope based on events
  updateHope(amount, reason) {
    const oldHope = this.hope;
    this.hope = Math.max(0, Math.min(100, this.hope + amount));
    
    if (oldHope !== this.hope) {
      if (amount > 0) {
        return `Hope increased by ${amount} (${reason}). Settlement hope is now ${this.hope}.`;
      } else {
        return `Hope decreased by ${Math.abs(amount)} (${reason}). Settlement hope is now ${this.hope}.`;
      }
    }
    
    return null;
  }
  
  // Calculate visitor chance based on hope
  getVisitorChance() {
    if (this.hope < 30) return 0;
    return Math.min(15, 5 + Math.floor(this.hope / 10));
  }
  
  // Get hope description and effects
  getHopeDescription() {
    const mitigationPercent = Math.min(50, Math.floor(this.hope / 2));
    let hopeDescription;
    
    if (this.hope >= 80) {
      hopeDescription = "Your settlers are inspired and optimistic about their future.";
    } else if (this.hope >= 60) {
      hopeDescription = "Your settlement has a positive atmosphere.";
    } else if (this.hope >= 40) {
      hopeDescription = "The mood in the settlement is cautiously hopeful.";
    } else if (this.hope >= 20) {
      hopeDescription = "Doubt and concern are spreading in the settlement.";
    } else {
      hopeDescription = "The settlement feels bleak and desperate.";
    }
    
    const effects = [
      hopeDescription,
      `Reduces health/morale penalties by ${mitigationPercent}%`
    ];
    
    // Display visitor chance if hope is high enough
    if (this.hope >= 30) {
      const visitorChance = this.getVisitorChance();
      effects.push(`${visitorChance}% daily chance of attracting visitors`);
    }
    
    return effects;
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
    
    // Generate a random name
    const survivorNames = [
      'Riley', 'Jordan', 'Taylor', 'Casey', 'Quinn', 'Avery', 
      'Blake', 'Drew', 'Jamie', 'Morgan', 'Rowan', 'Reese',
      'Skyler', 'Dakota', 'Kendall', 'Parker', 'Hayden', 'Finley'
    ];
    const name = survivorNames[Math.floor(Math.random() * survivorNames.length)];
    
    // Random gift (small amount of resources they bring)
    const gift = {
      food: Math.random() < 0.7 ? randomInt(1, 2) : 0,
      water: Math.random() < 0.7 ? randomInt(1, 2) : 0,
      meds: role === 'Medic' ? 1 : (Math.random() < 0.3 ? 1 : 0)  // Medics always bring 1 medicine
    };
    
    return { name, role, health, morale, gift };
  }
  
  // Format for display
  toString() {
    return `Settlement Resources: Food: ${this.resources.food}, Water: ${this.resources.water}, Meds: ${this.resources.meds}
Settlement Hope: ${this.hope}`;
  }
}

module.exports = Settlement;