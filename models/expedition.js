// models/expedition.js
const { randomInt } = require('../utils/utils');
const gameConfig = require('../config/game-config');
const resourcesConfig = require('../config/resources-config');

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
      materials: 0  // Added materials as a possible resource
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
    const config = gameConfig.expedition;
    
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
    // Get config data
    const config = gameConfig.expedition;
    const resConfig = resourcesConfig.expeditionResources;
    
    // Handle emergency expeditions differently
    if (this.radius === 'emergency') {
      this.generateEmergencyResources();
      return;
    }

    // Check if expedition is successful at finding resources
    const isSuccessful = Math.random() < config.successChance[this.radius];

    if (!isSuccessful) {
      this.handleFailedExpedition();
      return;
    }

    // Calculate base amount from duration and radius
    const baseAmount = Math.floor(this.duration * config.resourceMultiplier[this.radius]);

    // Add variability to resource returns
    const variabilityFactor = resConfig.variability.min + 
                             (Math.random() * (resConfig.variability.max - resConfig.variability.min));
    const adjustedAmount = Math.ceil(baseAmount * variabilityFactor);

    // Create "jackpot" chance for exceptional finds
    const jackpot = Math.random() < config.jackpotChance;
    const jackpotMultiplier = jackpot ? 2 : 1;

    // Distribute resources - prioritize food and water
    this.resources.food += Math.ceil(adjustedAmount * resConfig.distribution.food * jackpotMultiplier);
    this.resources.water += Math.ceil(adjustedAmount * resConfig.distribution.water * jackpotMultiplier);

    // Medicine only available based on radius config
    const medicineChance = resConfig.medicineChance[this.radius] || 0;
    if (Math.random() < medicineChance) {
      this.resources.meds += jackpot ? randomInt(1, 3) : 1;
    }

    // Materials can be found in medium and large radius expeditions
    if (this.radius === 'medium' || this.radius === 'large') {
      // Materials are less common than other resources
      const materialsChance = this.radius === 'large' ? 0.4 : 0.2;
      if (Math.random() < materialsChance) {
        const baseAmount = this.radius === 'large' ? randomInt(1, 3) : 1;
        this.resources.materials += jackpot ? baseAmount * 2 : baseAmount;
      }
    }

    // Record jackpot
    if (jackpot) {
      this.jackpotFind = true;
    }

    // Random delay chance
    if (Math.random() < config.delayChance) {
      this.duration += randomInt(1, 2);
      this.delayReason = "encountered obstacles";
    }
  }
  
  // Handle emergency expeditions
  generateEmergencyResources() {
    // Much higher failure chance for emergency expeditions
    if (Math.random() > gameConfig.expedition.successChance.emergency) {
      this.failureReason = "couldn't find any resources";
      return;
    }

    // Very modest returns if successful
    const emergency = resourcesConfig.expeditionResources.emergency;
    this.resources.food = randomInt(emergency.food.min, emergency.food.max); 
    this.resources.water = randomInt(emergency.water.min, emergency.water.max); 
  }
  
  // Handle failed expeditions
  handleFailedExpedition() {
    // Failed expedition - minimal or no resources
    if (Math.random() < 0.7) {  // 70% chance of complete failure
      this.failureReason = "couldn't find any resources";
    } else {
      // Partial failure - tiny amount of resources
      this.resources.food += Math.random() < 0.5 ? 1 : 0;
      this.resources.water += Math.random() < 0.5 ? 1 : 0;
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
      const survivorChance = gameConfig.expedition.survivorChance[this.radius] || 0;
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

    // Generate a random name
    const survivorNames = [
      'Riley', 'Jordan', 'Taylor', 'Casey', 'Quinn', 'Avery', 
      'Blake', 'Drew', 'Jamie', 'Morgan', 'Rowan', 'Reese',
      'Skyler', 'Dakota', 'Kendall', 'Parker', 'Hayden', 'Finley'
    ];
    const name = survivorNames[Math.floor(Math.random() * survivorNames.length)];

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