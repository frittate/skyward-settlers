// engine/game-engine.js
const { randomInt } = require('../utils/utils');
const Settler = require('../models/settler');
const EventSystem = require('../systems/event-system/event-system');
const Settlement = require('../models/settlement');
const MorningPhase = require('./phases/morning-phase');
const MiddayPhase = require('./phases/midday-phase');
const AfternoonPhase = require('./phases/afternoon-phase');
const EveningPhase = require('./phases/evening-phase');
const gameConfig = require('../config/game-config');

// Main game class
class GameEngine {
  constructor(rl, askQuestion) {
    this.rl = rl;
    this.askQuestion = askQuestion;
    this.day = 1;

    // Create settlement
    this.settlement = new Settlement();

    const availableNames = [...gameConfig.survivorNames];
    const selectedNames = [];
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * availableNames.length);
      selectedNames.push(availableNames.splice(randomIndex, 1)[0]);
    }

    // Initialize starter settlers with random health and hope
    this.settlers = [
      new Settler(selectedNames[0], 'Generalist', this.getRandomHealth(), 80),
      new Settler(selectedNames[1], 'Generalist', this.getRandomHealth(), 75),
      new Settler(selectedNames[2], 'Mechanic', this.getRandomHealth(), 75)
    ];
    
    this.expeditions = []; // Track ongoing expeditions
    this.eventSystem = new EventSystem();
    this.eventLog = []; // Store narrative events
    
    // Initialize game phases
    this.initializePhases();
  }

  getRandomHealth() {
    return Math.floor(Math.random() * (95 - 70 + 1)) + 70;
  }
  
  // Initialize game phases
  initializePhases() {
    this.morningPhase = new MorningPhase(this);
    this.middayPhase = new MiddayPhase(this);
    this.afternoonPhase = new AfternoonPhase(this);
    this.eveningPhase = new EveningPhase(this);
  }

  // Add a message to the event log
  logEvent(message) {
    this.eventLog.push({
      day: this.day,
      message: message
    });
    console.log(message);
  }

  displaySettlerStatus() {
    console.log('\nSETTLERS:');
    this.settlers.forEach((settler, index) => {
      console.log(settler.toString())
    });
  }

  displayResourcesStatus() {
    console.log('\nRESOURCES:');
    console.log(`Food: ${this.settlement.resources.food}`);
    console.log(`Water: ${this.settlement.resources.water}`);
    console.log(`Meds: ${this.settlement.resources.meds}`);
    console.log(`Materials: ${this.settlement.resources.materials}`);
  }

  displaySettlementStatus() {
    console.log('\nSETTLEMENT:');
    console.log(`${this.settlement.getHopeText(this.settlers)}`)
    console.log(`${this.settlement.infrastructure.toString()}`)
  }
  

  // Check for critical settler status (death, abandonment)
  checkCriticalStatus() {
    for (let i = this.settlers.length - 1; i >= 0; i--) {
      const settler = this.settlers[i];

      // Check health
      if (settler.health <= 0) {
        this.logEvent(`\n! ${settler.name} has died due to poor health!`);
        this.settlers.splice(i, 1);
        // Major hope loss when settler dies
        const hopeMessage = this.updateAllSettlersMorale(gameConfig.hope.hopeChange.settlerDeath, "settler death");
        if (hopeMessage) this.logEvent(hopeMessage);
        continue;
      }

      // Check morale
      if (settler.morale <= 0) {
        this.logEvent(`\n! ${settler.name} has left the settlement due to low morale!`);
        this.settlers.splice(i, 1);
        // Major hope loss when settler leaves
        const hopeMessage = this.updateAllSettlersMorale(gameConfig.hope.hopeChange.settlerAbandonment, "settler abandonment");
        if (hopeMessage) this.logEvent(hopeMessage);
        continue;
      }
    }
  }
  
  updateAllSettlersMorale(amount, reason, excludeSettler = null) {
    const messages = [];
    
    // Ensure amount is a valid number
    if (typeof amount !== 'number' || isNaN(amount)) {
      console.error('Invalid morale change amount:', amount);
      return 'Error: Invalid morale change amount.';
    }

    this.settlers.forEach(settler => {
      // Skip excluded settler if provided
      if (excludeSettler && settler === excludeSettler) {
        return;
      }
      
      const message = settler.updateMorale(amount, reason);
      if (message) {
        messages.push(message);
      }
    });

    return messages.join('\n');
  }

  getSettlersOnExpedition(){
    return this.settlers.filter(settler => settler.activity === 'expedition');
  }

  getSettlersAtHome() {
    return this.settlers.filter(settler => settler.activity !== 'expedition')
  }

  getSettlersAvailableForTasks() {
    return this.settlers.filter(settler => 
      settler.activity !== 'expedition' && 
      settler.activity !== 'infrastructure' && 
      !settler.recovering && 
      !settler.wounded
    );
  }

  // Generate a random survivor/visitor
  generateSurvivor() {
    // Random attributes for the survivor
    const health = randomInt(40, 80);
    const morale = randomInt(50, 90);
  
    const roleChances = gameConfig.survivorRoleChances || { Medic: 0.4, Generalist: 0.4, Mechanic: 0.2 };
  
    // Generate a weighted random role.
    const totalChance = Object.values(roleChances).reduce((sum, chance) => sum + chance, 0);
    const roleRoll = Math.random() * totalChance;
    let cumulative = 0;
    let role = 'Generalist'; // default fallback
  
    for (const [roleName, chance] of Object.entries(roleChances)) {
      cumulative += chance;
      if (roleRoll < cumulative) {
        role = roleName;
        break;
      }
    }

    const settlerNames = new Set(this.settlers.map(settler => settler.name))
    const availableNames = gameConfig.survivorNames.filter(name => !settlerNames.has(name))
  
    // Pick a random name from the config
    const name = availableNames[Math.floor(Math.random() * availableNames.length)];
  
    // Generate a random gift (a small resource bonus)
    const gift = {
      food: Math.random() < 0.7 ? randomInt(1, 2) : 0,
      water: Math.random() < 0.7 ? randomInt(1, 2) : 0,
      meds: role === 'Medic' ? 1 : (Math.random() < 0.3 ? 1 : 0), // Medics always bring 1 medicine
      materials: Math.random() < 0.4 ? randomInt(1, 3) : 0  // Sometimes bring materials
    };
  
    return { name, role, health, morale, gift };
  }
  // Run a full day cycle
  async runDayCycle() {
    // Phase 1: Morning - Returns and reports
    await this.morningPhase.execute();

    // Check if all settlers at home have died but some are on expedition
    const homeSettlers = this.settlers.filter(s => s.activity === '' || s.activity !== 'expedition');
    const expeditionSettlers = this.settlers.filter(s => s.activity === 'expedition');

    if (homeSettlers.length === 0 && expeditionSettlers.length > 0) {
      console.log("\n! CRITICAL SITUATION: All settlers at the settlement have died or left!");
      console.log(`There are still ${expeditionSettlers.length} settlers on expedition who may return.`);
    }

    // Phase 2: Midday - Resource distribution
    await this.middayPhase.execute();

    // Phase 3: Afternoon - Task assignment
    await this.afternoonPhase.execute();

    // Phase 4: Evening - Day summary
    const continueGame = await this.eveningPhase.execute();

    // Check for game over - only if ALL settlers are gone
    if (this.settlers.length === 0) {
      console.log("\n*** GAME OVER ***");
      console.log("All settlers have died or left the settlement.");
      return false;
    }

    return continueGame;
  }

  // Main game loop
  async start() {
    console.log("=== SKYWARD SETTLERS ===");
    console.log("A post-apocalyptic rooftop settlement simulation");

    // Main game loop
    let continueGame = true;
    while (continueGame) {
      continueGame = await this.runDayCycle();
    }

    console.log("\nThanks for playing Skyward Settlers!");
    this.rl.close();
  }
}

module.exports = GameEngine;
