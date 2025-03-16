// models/expedition.js
const { randomInt } = require('../utils/utils');
const gameConfig = require('../config/game-config');
const expeditionConfig = require('../config/expedition-config');

// Expedition class to handle foraging
class Expedition {
  constructor(settler, radius, duration = null) {
    this.settler = settler;
    this.radius = radius;
    this.foundSurvivor = false;
    this.survivor = null;
    this.resources = {
      food: 0,
      water: 0,
      meds: 0,
      materials: 0
      // Add new resource types here with 0 as initial value
    };
    this.events = [];
    this.returnDay = 0; // Will be set by the game
    this.failureReason = null;
    this.statusReport = null;
    this.statusReportDay = 0;
    this.jackpotFind = false;
    
    // Set expedition parameters based on config
    this.setExpeditionParameters(duration);
  }
  
  // Set up expedition parameters based on radius and config
  setExpeditionParameters(customDuration) {
    const config = expeditionConfig.expedition;
    
    // Set duration
    if (customDuration) {
      this.duration = customDuration;
    } else {
      const durationRange = config.duration[this.radius];
      this.duration = randomInt(durationRange.min, durationRange.max);
    }
    
    // Set supply costs
    this.supplyCost = { ...config.supplyCost[this.radius] };
    
    // Set recovery time
    this.recoverTime = config.recoverTime[this.radius];
  }

  // Add resource to the expedition
  addResource(type, amount) {
    if (this.resources[type] !== undefined) {
      this.resources[type] += amount;
    }
  }
  
  // Generate base resources found during expedition
  generateBaseResources() {
    const config = expeditionConfig.expedition;
    const resConfig = expeditionConfig.expeditionResources;
  
    // Handle emergency expeditions separately
    if (this.radius === 'emergency') {
      this.generateEmergencyResources();
      return;
    }
  
    // Check success
    const isSuccessful = Math.random() < config.successChance[this.radius];
    console.log('Expedition success: ', isSuccessful)
    if (!isSuccessful) {
      this.handleFailedExpedition();
      return;
    }

  
    // We’ll do just one “roll” for the entire expedition
    // (instead of day-by-day summation).
    let foundAnyResource = false;
  
    // Decide if there’s a jackpot 
    const jackpot = Math.random() < config.jackpotChance;
    this.jackpotFind = jackpot; // track it
  
    // Pick which resource gets the jackpot (if any)
    let jackpotResource = null;
    if (jackpot) {
      const resourceList = Object.keys(resConfig.baseAmounts);
      jackpotResource = resourceList[Math.floor(Math.random() * resourceList.length)];
    }
  
    // For each resource type
    for (const [resourceType, radiusMap] of Object.entries(resConfig.baseAmounts)) {
      const range = radiusMap[this.radius];
      if (!range) continue;
  
      let amountFound = randomInt(range.min, range.max);
  
      // Apply variability if desired
      const variabilityFactor = resConfig.variability.min + 
        (Math.random() * (resConfig.variability.max - resConfig.variability.min));
      amountFound = Math.round(amountFound * variabilityFactor);
  
      // Apply resourceMultiplier if you still want it
      if (config.resourceMultiplier[this.radius]) {
        amountFound = Math.round(amountFound * config.resourceMultiplier[this.radius]);
      }
  
      // Jackpot doubles the chosen resource
      if (resourceType === jackpotResource) {
        amountFound *= 2;
      }
  
      // Make sure food/water is at least 1 if you want them guaranteed
      if (resourceType === 'food' || resourceType === 'water') {
        amountFound = Math.max(amountFound, 1);
      } else {
        amountFound = Math.max(amountFound, 0);
      }
  
      // Add to expedition resources
      if (amountFound > 0) {
        this.resources[resourceType] += amountFound;
        foundAnyResource = true;
      }
    }
  
    // Ensure we have at least 1 of something (optional)
    if (!foundAnyResource) {
      this.resources.food += 1;
    }
  
    // Delay chance
    if (Math.random() < config.delayChance) {
      this.duration += randomInt(1, 2);
      this.delayReason = "encountered obstacles";
    }
  }

  // Handle emergency expeditions
  generateEmergencyResources() {
    // Much higher failure chance for emergency expeditions
    if (Math.random() > expeditionConfig.expedition.successChance.emergency) {
      this.failureReason = "couldn't find any resources";
      return;
    }

    // Get emergency resources from config
    const emergency = expeditionConfig.expeditionResources.emergency;
    
    // Add resources for each type defined in emergency config
    for (const [resourceType, range] of Object.entries(emergency)) {
      if (range && range.min !== undefined && range.max !== undefined) {
        this.resources[resourceType] = randomInt(range.min, range.max);
      }
    }
  }
  
  // What if expeditions fail
  handleFailedExpedition() {
    // Failed expedition - minimal or no resources
    if (Math.random() < 0.7) {  // 70% chance of complete failure
      this.failureReason = "couldn't find any resources";
      // Ensure all resources stay at zero
      for (const key in this.resources) {
        this.resources[key] = 0;
      }
    } else {
      // Partial failure - tiny amount of resources
      // Try to find at least one type of resource
      const possibleResources = ['food', 'water'];
      const chosenResource = possibleResources[Math.floor(Math.random() * possibleResources.length)];
      this.resources[chosenResource] += 1;
      
      this.failureReason = "found very little";
    }
  }

  // Generate a status report for mid-expedition updates
  generateStatusReport() {
    // Default reports
    const possibleReports = [
      "is finding good scavenging spots",
      "has found some supplies",
      "is making steady progress",
      "has encountered some difficulties but continues",
      "reports the area is more dangerous than expected",
      "has found evidence of other survivors"
    ];

    // Choose a report based on expedition success and events so far
    let report;

    // If expedition failed to find many resources
    if (this.failureReason) {
      report = `${this.settler.name} ${this.failureReason} but continues searching`;
    } 
    // If there have been negative events
    else if (this.events.some(e => e.day <= this.statusReportDay && e.name.includes("Hostile") || e.name.includes("Contaminated"))) {
      report = `${this.settler.name} has encountered hostile scavengers but escaped`;
    }
    // If found medicine
    else if (this.resources.meds > 0) {
      report = `${this.settler.name} has found medical supplies`;
    }
    // If found materials
    else if (this.resources.materials > 0) {
      report = `${this.settler.name} has found useful building materials`;
    }
    // If found plenty of water
    else if (this.resources.water >= 3) {
      report = `${this.settler.name} has found a good water source`;
    }
    // If found plenty of food
    else if (this.resources.food >= 3) {
      report = `${this.settler.name} has found a food cache`;
    }
    // Default report
    else {
      report = `${this.settler.name} ${possibleReports[Math.floor(Math.random() * possibleReports.length)]}`;
    }

    // No return time information - more tension
    this.statusReport = report;
  }

  // Process the expedition and its events
  processExpedition(eventSystem) {
    // Generate base resources
    this.generateBaseResources();

    // Generate events for each day
    for (let day = 1; day <= this.duration; day++) {
      const event = eventSystem.generateEvent(this.settler, this);
      if (event) {
        this.events.push({
          day: day,
          ...event
        });
      }
    }

    // Chance to find a survivor (only for non-emergency expeditions)
    if (this.radius !== 'emergency') {
      const survivorChance = expeditionConfig.expedition.survivorChance[this.radius] || 0;
      if (Math.random() < survivorChance) {
        this.generateSurvivor();
      }
    }

    // Create status report for longer expeditions
    if (this.duration >= 2) {
      // Status report comes halfway through
      this.statusReportDay = Math.floor(this.duration / 2);

      // Generate status update based on resources found and events
      this.generateStatusReport();
    }

    return {
      resources: this.resources,
      events: this.events,
      statusReport: this.statusReport,
      statusReportDay: this.statusReportDay,
      foundSurvivor: this.foundSurvivor,
      survivor: this.survivor
    };
  }

  // Generate a random survivor
  generateSurvivor() {
    this.foundSurvivor = true;

    // Random survivor attributes
    const health = randomInt(30, 70);
    const morale = randomInt(40, 80);

    // Determine role with weighted probability
    const roleRoll = Math.random();
    let role;

    if (roleRoll < 0.60) {
      role = 'Generalist';
    } else if (roleRoll < 0.90) {
      role = 'Mechanic';
    } else {
      role = 'Medic';
    }

    const name = gameConfig.survivorNames[Math.floor(Math.random() * gameConfig.survivorNames.length)];

    // Random gift (small amount of resources they bring)
    const gift = {
      food: Math.random() < 0.5 ? randomInt(1, 2) : 0,
      water: Math.random() < 0.5 ? randomInt(1, 2) : 0,
      meds: role === 'Medic' ? 1 : (Math.random() < 0.2 ? 1 : 0),  // Medics always bring 1 medicine
      materials: role === 'Mechanic' ? randomInt(1, 3) : (Math.random() < 0.2 ? 1 : 0) // Mechanics bring materials
    };

    this.survivor = { name, role, health, morale, gift };
  }
}

module.exports = Expedition;