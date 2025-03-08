// engine/game-engine.js
const Settler = require('../models/settler');
const EventSystem = require('../systems/event-system/event-system');
const Settlement = require('../models/settlement');
const MorningPhase = require('./phases/morning-phase');
const MiddayPhase = require('./phases/midday-phase');
const AfternoonPhase = require('./phases/afternoon-phase');
const EveningPhase = require('./phases/evening-phase');
const gameConfig = require('../config/game-config');
const chalk = require('chalk');

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

    // Initialize starter settlers with random names
    this.settlers = [
      new Settler(selectedNames[0], 'Generalist', 100, 100),
      new Settler(selectedNames[1], 'Generalist', 100, 100),
      new Settler(selectedNames[2], 'Mechanic', 40, 80, true) // Third settler starts wounded
    ];
    
    this.expeditions = []; // Track ongoing expeditions
    this.eventSystem = new EventSystem();
    this.eventLog = []; // Store narrative events
    
    // Initialize game phases
    this.initializePhases();
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
  displayStatus() {
    console.log(chalk.bold.blue(`\n--- DAY ${this.day} STATUS ---`));
    console.log(chalk.bold('\nSETTLERS:'));
    this.settlers.forEach((settler, index) => {
      if (settler.busy) {
        let busyStatus;
        // Check what type of busy this is
        if (settler.busyUntil === "shelter") {
          busyStatus = "Building shelter";
        } else if (settler.busyUntil === "infrastructure") {
          busyStatus = "Building infrastructure";
        } else {
          busyStatus = "On expedition";
        }
        console.log(`${index + 1}. ${settler.name} (${settler.role}) - ${busyStatus}`);
      } else {
        console.log(`${index + 1}. ${settler.toString()}`);
      }
    });
  
    console.log(chalk.bold('\nRESOURCES:'));
    console.log(`Food: ${this.settlement.resources.food}`);
    console.log(`Water: ${this.settlement.resources.water}`);
    console.log(`Meds: ${this.settlement.resources.meds}`);
    console.log(`Materials: ${this.settlement.resources.materials}`);
  
    // Display Settlement Hope - passing settlers to the settlement
    const currentHope = this.settlement.getHope(this.settlers);
    console.log(chalk.bold(`\nSETTLEMENT HOPE: ${currentHope}`));
    this.displayHopeEffect(currentHope);
  
    // Display Settlement Infrastructure
    console.log(chalk.bold('\nINFRASTRUCTURE:'));
    const infrastructureStatus = this.settlement.displayInfrastructureStatus();
    infrastructureStatus.forEach(line => console.log(line));
  }
  
  // Display the effect of current hope level
  displayHopeEffect(currentHope) {
    const hopeEffects = this.settlement.getHopeDescription(currentHope);
    hopeEffects.forEach(effect => {
      console.log(`- ${effect}`);
    });
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
        const hopeMessage = this.updateAllSettlersMorale(this.settlers, gameConfig.hope.hopeChange.settlerDeath, "settler death");
        if (hopeMessage) this.logEvent(hopeMessage);
        continue;
      }

      // Check morale
      if (settler.morale <= 0) {
        this.logEvent(`\n! ${settler.name} has left the settlement due to low morale!`);
        this.settlers.splice(i, 1);
        // Major hope loss when settler leaves
        const hopeMessage = this.updateAllSettlersMorale(this.settlers, gameConfig.hope.hopeChange.settlerAbandonment, "settler abandonment");
        if (hopeMessage) this.logEvent(hopeMessage);
        continue;
      }
    }
  }
  
  updateAllSettlersMorale(settlers, amount, reason, excludeSettler = null) {
    const messages = [];
    
    settlers.forEach(settler => {
      // Skip excluded settler if provided
      if (excludeSettler && settler === excludeSettler) {
        return;
      }
      
      // Skip busy settlers if they're on expedition (optional, remove if you want to affect all)
      if (settler.busy && typeof settler.busyUntil === 'number') {
        return;
      }
      
      const message = settler.updateMorale(amount, reason);
      if (message) {
        messages.push(message);
      }
    });
    
    return messages;
  }

  // Run a full day cycle
  async runDayCycle() {
    // Phase 1: Morning - Returns and reports
    await this.morningPhase.execute();

    // Check if all settlers at home have died but some are on expedition
    const homeSettlers = this.settlers.filter(s => !s.busy);
    const expeditionSettlers = this.settlers.filter(s => s.busy);

    if (homeSettlers.length === 0 && expeditionSettlers.length > 0) {
      console.log(chalk.bold.red("\n! CRITICAL SITUATION: All settlers at the settlement have died or left!"));
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
      console.log(chalk.bold.red("\n*** GAME OVER ***"));
      console.log(chalk.red("All settlers have died or left the settlement."));
      return false;
    }

    return continueGame;
  }

  // Main game loop
  async start() {
    console.log(chalk.bgCyan.black("=== SKYWARD SETTLERS ==="));
    console.log("A post-apocalyptic rooftop settlement simulation");
    console.log("Core Loop Prototype\n");

    this.displayStatus();
    await this.askQuestion("\nPress Enter to begin Day 1...");

    // Main game loop
    let continueGame = true;
    while (continueGame) {
      continueGame = await this.runDayCycle();
    }

    console.log(chalk.cyan("\nThanks for playing Skyward Settlers!"));
    this.rl.close();
  }
}

module.exports = GameEngine;