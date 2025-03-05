// systems/event-system/negative-events.js
const { randomInt } = require('../../utils/utils');

// Negative event definitions for expeditions
const negativeEvents = [
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
      // Lose some gathered resources, but not all of any critical resource
      let lostType = '';
      let lostAmount = 0;

      // Check food first - only take if they have more than 2
      if (expedition.resources.food > 2) {
        lostAmount = Math.ceil(expedition.resources.food / 2);
        // Never take more than 75% of the food
        lostAmount = Math.min(lostAmount, Math.floor(expedition.resources.food * 0.75));
        expedition.resources.food -= lostAmount;
        lostType = 'food';
      } 
      // Then check water - only take if they have more than 2
      else if (expedition.resources.water > 2) {
        lostAmount = Math.ceil(expedition.resources.water / 2);
        // Never take more than 75% of the water
        lostAmount = Math.min(lostAmount, Math.floor(expedition.resources.water * 0.75));
        expedition.resources.water -= lostAmount;
        lostType = 'water';
      } 
      // Then check meds or materials
      else if (expedition.resources.materials > 1) {
        lostAmount = Math.ceil(expedition.resources.materials / 2);
        expedition.resources.materials -= lostAmount;
        lostType = 'materials';
      }
      else if (expedition.resources.meds > 0) {
        lostAmount = Math.min(1, expedition.resources.meds);
        expedition.resources.meds -= lostAmount;
        lostType = 'medicine';
      }

      if (lostAmount > 0) {
        return `Hostile scavengers took ${lostAmount} ${lostType} from ${settler.name}!`;
      } else {
        // If they don't have enough resources to steal, they attack instead
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

module.exports = negativeEvents;