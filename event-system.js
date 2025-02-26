// Utility function for random integer in range
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Expedition Events System
class EventSystem {
  constructor() {
    this.positiveEvents = [
      {
        name: "Untouched Stockpile",
        description: "They discover an untouched stockpile of supplies in an abandoned apartment.",
        effect: (settler, expedition) => {
          const foodBonus = randomInt(1, 2);
          const waterBonus = randomInt(1, 2);
          expedition.addResource('food', foodBonus);
          expedition.addResource('water', waterBonus);
          return `Found extra ${foodBonus} food and ${waterBonus} water!`;
        }
      },
      {
        name: "Rain Collector",
        description: "They find a functioning rain collector on a nearby roof.",
        effect: (settler, expedition) => {
          const waterBonus = randomInt(2, 4);
          expedition.addResource('water', waterBonus);
          return `Collected ${waterBonus} extra water!`;
        }
      },
      {
        name: "Medical Cabinet",
        description: "They break into an apartment with an untouched medicine cabinet.",
        effect: (settler, expedition) => {
          const medBonus = randomInt(1, 2);
          expedition.addResource('meds', medBonus);
          return `Found ${medBonus} medicine!`;
        }
      },
      {
        name: "Rooftop Garden",
        description: "They discover a rooftop garden with some edible plants still growing.",
        effect: (settler, expedition) => {
          const foodBonus = randomInt(2, 4);
          expedition.addResource('food', foodBonus);
          return `Harvested ${foodBonus} extra food!`;
        }
      },
      {
        name: "Friendly Survivor",
        description: "They meet a friendly survivor who shares some supplies.",
        effect: (settler, expedition) => {
          const foodBonus = randomInt(1, 2);
          const waterBonus = randomInt(1, 2);
          expedition.addResource('food', foodBonus);
          expedition.addResource('water', waterBonus);
          return `Received ${foodBonus} food and ${waterBonus} water from a friendly survivor!`;
        }
      }
    ];
    
    this.negativeEvents = [
      {
        name: "Roof Collapse",
        description: "Part of a roof collapses while they're exploring it.",
        effect: (settler, expedition) => {
          const damage = randomInt(10, 20);
          settler.health = Math.max(0, settler.health - damage);
          // 50% chance of getting wounded from a roof collapse
          if (Math.random() < 0.5) {
            settler.wounded = true;
            return `${settler.name} was injured, losing ${damage} health (now ${settler.health}). The injury has left them WOUNDED and will need medicine to fully recover.`;
          }
          return `${settler.name} was injured, losing ${damage} health (now ${settler.health}).`;
        }
      },
      {
        name: "Contaminated Water",
        description: "They drink from a water source that turns out to be contaminated.",
        effect: (settler, expedition) => {
          const damage = randomInt(5, 15);
          settler.health = Math.max(0, settler.health - damage);
          return `${settler.name} got sick from contaminated water, losing ${damage} health (now ${settler.health}).`;
        }
      },
      {
        name: "Hostile Scavengers",
        description: "They encounter hostile scavengers who demand supplies.",
        effect: (settler, expedition) => {
          // Lose some gathered resources
          let lostType = '';
          let lostAmount = 0;
          
          if (expedition.resources.food > 1) {
            lostAmount = Math.ceil(expedition.resources.food / 2);
            expedition.resources.food -= lostAmount;
            lostType = 'food';
          } else if (expedition.resources.water > 1) {
            lostAmount = Math.ceil(expedition.resources.water / 2);
            expedition.resources.water -= lostAmount;
            lostType = 'water';
          } else if (expedition.resources.meds > 0) {
            lostAmount = Math.min(1, expedition.resources.meds);
            expedition.resources.meds -= lostAmount;
            lostType = 'medicine';
          }
          
          if (lostAmount > 0) {
            return `Hostile scavengers took ${lostAmount} ${lostType} from ${settler.name}!`;
          } else {
            const damage = randomInt(5, 15);
            settler.health = Math.max(0, settler.health - damage);
            return `Hostile scavengers attacked ${settler.name}, causing ${damage} damage (now ${settler.health})!`;
          }
        }
      },
      {
        name: "Bad Fall",
        description: "They lose their footing while jumping between buildings.",
        effect: (settler, expedition) => {
          const damage = randomInt(15, 25);
          settler.health = Math.max(0, settler.health - damage);
          settler.wounded = true; // Falls cause wounds that need medical attention
          return `${settler.name} fell and was injured, losing ${damage} health (now ${settler.health}). They are now WOUNDED and need medicine to fully recover.`;
        }
      },
      {
        name: "Extreme Weather",
        description: "They're caught in a sudden downpour with nowhere to take shelter.",
        effect: (settler, expedition) => {
          const healthLoss = randomInt(5, 10);
          const moraleLoss = randomInt(10, 20);
          settler.health = Math.max(0, settler.health - healthLoss);
          settler.morale = Math.max(0, settler.morale - moraleLoss);
          return `${settler.name} was caught in bad weather, losing ${healthLoss} health and ${moraleLoss} morale.`;
        }
      }
    ];
    
    this.neutralEvents = [
      {
        name: "Abandoned Camp",
        description: "They find an abandoned camp with remnants of supplies.",
        effect: (settler, expedition) => {
          return "They find some signs of other survivors, but nothing useful.";
        }
      },
      {
        name: "Strange Noises",
        description: "They hear strange noises echoing between the buildings.",
        effect: (settler, expedition) => {
          return "The city feels alive in an unsettling way, but they continue their search.";
        }
      },
      {
        name: "Old Photos",
        description: "They find old photos of the city before everything changed.",
        effect: (settler, expedition) => {
          settler.morale = Math.min(100, settler.morale + 5);
          return `${settler.name} finds old photos, bringing back memories (+5 morale).`;
        }
      }
    ];
  }
  
  // Generate a random event based on expedition radius
  generateEvent(settler, expedition) {
    const radius = expedition.radius;
    
    // Calculate event chance based on radius
    // Larger radius = higher chance of events
    const eventChance = {
      'small': 0.3,  // 30% chance per day
      'medium': 0.5, // 50% chance per day
      'large': 0.7   // 70% chance per day
    };
    
    // Check if an event occurs
    if (Math.random() > eventChance[radius]) {
      return null; // No event
    }
    
    // Determine event type (positive, negative, neutral)
    // Larger radius = higher chance of negative events
    let positiveChance, negativeChance;
    
    switch(radius) {
      case 'small':
        positiveChance = 0.6;
        negativeChance = 0.3;
        break;
      case 'medium':
        positiveChance = 0.5;
        negativeChance = 0.4;
        break;
      case 'large':
        positiveChance = 0.4;
        negativeChance = 0.5;
        break;
    }
    
    const roll = Math.random();
    let eventPool;
    
    if (roll < positiveChance) {
      eventPool = this.positiveEvents;
    } else if (roll < positiveChance + negativeChance) {
      eventPool = this.negativeEvents;
    } else {
      eventPool = this.neutralEvents;
    }
    
    // Select random event from the chosen pool
    const event = eventPool[Math.floor(Math.random() * eventPool.length)];
    
    return {
      name: event.name,
      description: event.description,
      result: event.effect(settler, expedition)
    };
  }
}

module.exports = EventSystem;