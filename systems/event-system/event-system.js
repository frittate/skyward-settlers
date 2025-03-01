const positiveEvents = require('./positive-events');
const negativeEvents = require('./negative-events');
const neutralEvents = require('./neutral-events');
const eventConfig = require('../../config/events-config');

class EventSystem {
  constructor() {
    this.positiveEvents = positiveEvents;
    this.negativeEvents = negativeEvents;
    this.neutralEvents = neutralEvents;
  }

  // Generate a random event based on expedition radius
  generateEvent(settler, expedition) {
    const radius = expedition.radius;

    // Calculate event chance based on radius from config
    const eventChance = eventConfig.eventChance[radius] || 0.3;

    // Check if an event occurs
    if (Math.random() > eventChance) {
      return null; // No event
    }

    // Get event type probabilities from config
    const positiveChance = eventConfig.typeChance[radius].positive;
    const negativeChance = eventConfig.typeChance[radius].negative;

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