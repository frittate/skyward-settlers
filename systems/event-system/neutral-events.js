// systems/event-system/neutral-events.js

// Neutral event definitions for expeditions
const neutralEvents = [
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

module.exports = neutralEvents;