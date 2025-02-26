// Expedition class to handle foraging
class Expedition {
  constructor(settler, radius, duration = null) {
    this.settler = settler;
    this.radius = radius;
    
    // Randomize duration based on radius if not specified
    if (!duration) {
      switch(radius) {
        case 'small':
          this.duration = Math.floor(Math.random() * 2) + 1; // 1-2 days
          break;
        case 'medium':
          this.duration = Math.floor(Math.random() * 3) + 2; // 2-4 days
          break;
        case 'large':
          this.duration = Math.floor(Math.random() * 3) + 3; // 3-5 days
          break;
        default:
          this.duration = 1;
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
  }
  
  addResource(type, amount) {
    if (this.resources[type] !== undefined) {
      this.resources[type] += amount;
    }
  }
  
  // Generate base resources based on radius and duration
  generateBaseResources() {
    // Base multipliers for different radii
    const multipliers = {
      'small': 1,
      'medium': 1.5,
      'large': 2
    };
    
    // Success chance varies by radius - smaller radius = higher chance of failure
    const successChance = {
      'small': 0.7,  // 30% chance of failure
      'medium': 0.8, // 20% chance of failure
      'large': 0.9   // 10% chance of failure
    };
    
    // Check if expedition is successful at finding resources
    const isSuccessful = Math.random() < successChance[this.radius];
    
    if (!isSuccessful) {
      // Failed expedition - minimal or no resources
      this.resources.food += Math.random() < 0.5 ? 1 : 0;
      this.resources.water += Math.random() < 0.5 ? 1 : 0;
      this.failureReason = "couldn't find many resources";
      return;
    }
    
    // Calculate base amount from duration and radius
    const baseAmount = Math.floor(this.duration * multipliers[this.radius]);
    
    // Distribute resources - prioritize food and water
    this.resources.food += Math.ceil(baseAmount * 0.4);
    this.resources.water += Math.ceil(baseAmount * 0.4);
    
    // Medicine only available in medium and large radius expeditions
    if (this.radius !== 'small' && Math.random() < 0.3 * multipliers[this.radius]) {
      this.resources.meds += 1;
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