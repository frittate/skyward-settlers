// systems/event-system/positive-events.js
const { randomInt } = require('../../utils/utils');

// Positive event definitions for expeditions
const positiveEvents = [
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
  },
  {
    name: "Abandoned Construction",
    description: "They find an abandoned construction site with usable materials.",
    effect: (settler, expedition) => {
      const materialsBonus = randomInt(1, 3);
      expedition.addResource('materials', materialsBonus);
      return `Salvaged ${materialsBonus} building materials!`;
    }
  },
  {
    name: "Hardware Store",
    description: "They discover a small hardware store that hasn't been completely looted.",
    effect: (settler, expedition) => {
      const materialsBonus = randomInt(2, 4);
      expedition.addResource('materials', materialsBonus);
      return `Found ${materialsBonus} building materials in the hardware store!`;
    }
  }
];

module.exports = positiveEvents;