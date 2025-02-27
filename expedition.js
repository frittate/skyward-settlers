// Expedition class to handle foraging
class Expedition {
  constructor(settler, radius, duration = null) {
    this.settler = settler;
    this.radius = radius;
    
    // Emergency expeditions have fixed duration
    if (radius === 'emergency') {
      this.duration = 1; // Always 1 day
      this.supplyCost = { food: 0, water: 0 }; // No supplies needed
      this.recoverTime = 1; // 1 day recovery
      return;
    }
    
    // Longer expedition durations for increased tension
    if (!duration) {
      switch(radius) {
        case 'small':
          this.duration = Math.floor(Math.random() * 2) + 2; // 2-3 days
          break;
        case 'medium':
          this.duration = Math.floor(Math.random() * 3) + 3; // 3-5 days
          break;
        case 'large':
          this.duration = Math.floor(Math.random() * 3) + 5; // 5-7 days
          break;
        default:
          this.duration = 2;
      }
    } else {
      this.duration = duration;
    }
    
    this.resources = {
      food: 0,
      water: 0,
      meds: 0
    };
    this.events = [];
    this.returnDay = 0; // Will be set by the game
    this.failureReason = null; // Reason if expedition fails to find resources
    this.statusReport = null; // Mid-expedition status report
    this.statusReportDay = 0; // Day when status report is generated
    this.jackpotFind = false; // Flag for exceptional finds
    
    // Required supplies for expedition
    this.supplyCost = {
      food: 0,
      water: 0
    };
    
    // Set supply costs based on radius
    switch(radius) {
      case 'small':
        this.supplyCost.food = 1;
        this.supplyCost.water = 1;
        break;
      case 'medium':
        this.supplyCost.food = 2;
        this.supplyCost.water = 2;
        break;
      case 'large':
        this.supplyCost.food = 3;
        this.supplyCost.water = 3;
        break;
    }
    
    // Recovery time needed after expedition
    this.recoverTime = 0;
    switch(radius) {
      case 'small':
        this.recoverTime = 1; // 1 day recovery
        break;
      case 'medium':
        this.recoverTime = 2; // 2 days recovery
        break;
      case 'large':
        this.recoverTime = 3; // 3 days recovery
        break;
    }
  }
  
  addResource(type, amount) {
    if (this.resources[type] !== undefined) {
      this.resources[type] += amount;
    }
  }
  
  // Generate base resources based on radius and duration
  generateBaseResources() {
    // Handle emergency expeditions differently
    if (this.radius === 'emergency') {
      // Much higher failure chance for emergency expeditions
      if (Math.random() < 0.7) { // 70% chance of failure
        this.failureReason = "couldn't find any resources";
        return;
      }
      
      // Very modest returns if successful
      this.resources.food = Math.ceil(Math.random() * 2) + 1; // 1-3 food
      this.resources.water = Math.ceil(Math.random() * 2) + 1; // 1-3 water
      return;
    }
    
    // Regular expedition resource generation
    // Improved multipliers for better rewards
    const multipliers = {
      'small': 2,     // 1.5-2.5x return
      'medium': 3,    // 2-4x return
      'large': 4.5    // 3-6x return
    };
    
    // Success chance varies by radius - higher failure rates
    const successChance = {
      'small': 0.7,  // 30% chance of failure
      'medium': 0.6, // 40% chance of failure
      'large': 0.5   // 50% chance of failure
    };
    
    // Check if expedition is successful at finding resources
    const isSuccessful = Math.random() < successChance[this.radius];
    
    if (!isSuccessful) {
      // Failed expedition - minimal or no resources
      if (Math.random() < 0.7) {  // 70% chance of complete failure
        this.failureReason = "couldn't find any resources";
        return;
      } else {
        // Partial failure - tiny amount of resources
        this.resources.food += Math.random() < 0.5 ? 1 : 0;
        this.resources.water += Math.random() < 0.5 ? 1 : 0;
        this.failureReason = "found very little";
        return;
      }
    }
    
    // Calculate base amount from duration and radius
    const baseAmount = Math.floor(this.duration * multipliers[this.radius]);
    
    // Add variability to resource returns
    const variabilityFactor = Math.random() * 0.5 + 0.75; // 0.75-1.25x modifier
    const adjustedAmount = Math.ceil(baseAmount * variabilityFactor);
    
    // Create "jackpot" chance for exceptional finds
    const jackpot = Math.random() < 0.15; // 15% chance
    const jackpotMultiplier = jackpot ? 2 : 1;
    
    // Distribute resources - prioritize food and water
    this.resources.food += Math.ceil(adjustedAmount * 0.4 * jackpotMultiplier);
    this.resources.water += Math.ceil(adjustedAmount * 0.4 * jackpotMultiplier);
    
    // Medicine only available in medium and large radius expeditions
    if (this.radius !== 'small' && Math.random() < 0.4 * multipliers[this.radius]) {
      this.resources.meds += jackpot ? randomInt(1, 3) : 1;
    }
    
    // Add jackpot message if applicable
    if (jackpot) {
      this.jackpotFind = true;
    }
    
    // Random delay chance (5%)
    if (Math.random() < 0.05) {
      this.duration += randomInt(1, 2);
      this.delayReason = "encountered obstacles";
    }
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
      statusReportDay: this.statusReportDay
    };
  }
  
  // Generate status report for mid-expedition updates
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
}

module.exports = Expedition;