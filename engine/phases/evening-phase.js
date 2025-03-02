// engine/phases/evening-phase.js
const { printPhaseHeader } = require('../../utils/utils');

class EveningPhase {
  constructor(gameEngine) {
    this.game = gameEngine;
  }

  async execute() {
    printPhaseHeader("EVENING PHASE: DAY SUMMARY");

    console.log(`Day ${this.game.day} is complete.`);

    // Summarize the day's events
    console.log("\nSETTLEMENT STATUS:");
    console.log(`- Settlers: ${this.game.settlers.length}`);
    console.log(`- Food remaining: ${this.game.settlement.resources.food}`);
    console.log(`- Water remaining: ${this.game.settlement.resources.water}`);
    console.log(`- Medicine remaining: ${this.game.settlement.resources.meds}`);
    console.log(`- Materials remaining: ${this.game.settlement.resources.materials}`);
    console.log(`- Active expeditions: ${this.game.expeditions.length}`);

    // Apply nightly exposure effects
    await this.applyNightlyEffects();

    // Preview tomorrow's events
    await this.displayTomorrowPreview();

    // Advance day
    this.game.day++;

    const continueGame = await this.game.askQuestion("\nAdvance to next day? (y/n): ");
    return continueGame.toLowerCase() === 'y';
  }

  // Apply nightly exposure effects to settlers
  async applyNightlyEffects() {
    console.log("\nNIGHT CONDITIONS:");
    
    // Get settlers who are present (not on expeditions)
    const presentSettlers = this.game.settlers.filter(s => !s.busy);
    
    // Apply nightly exposure effects based on shelter level
    const effects = this.game.settlement.applyNightlyExposureEffects(presentSettlers);
    
    // Display shelter status
    const shelterStatus = this.game.settlement.getShelterStatus();
    console.log(`Shelter: ${shelterStatus.name} (${shelterStatus.protection}% protection)`);
    
    // Display effects
    if (Array.isArray(effects)) {
      console.log("Exposure Effects:");
      for (const effect of effects) {
        console.log(`- ${effect}`);
      }
    } else {
      console.log(`- ${effects}`);
    }
    
    // Check settler critical status after night exposure
    this.game.checkCriticalStatus();
  }

  async displayTomorrowPreview() {
    console.log("\nTOMORROW'S PREVIEW:");

    // DON'T show who returns tomorrow - just that someone might
    const returningSettlerCount = this.game.expeditions.filter(exp => 
      exp.returnDay === this.game.day + 1
    ).length;
    
    if (returningSettlerCount > 0) {
      console.log(`- ${returningSettlerCount} expedition${returningSettlerCount > 1 ? 's' : ''} may return tomorrow.`);
    } else {
      console.log("- No expeditions expected to return tomorrow.");
    }

    // Resource needs preview
    const presentTomorrow = this.game.settlers.length - 
      this.game.expeditions.filter(exp => exp.returnDay > this.game.day + 1).length;
      
    console.log(`- ${presentTomorrow} settlers will need food and water tomorrow.`);

    // Resource warning
    if (this.game.settlement.resources.food < presentTomorrow) {
      console.log(`! WARNING: Not enough food for everyone tomorrow (${this.game.settlement.resources.food}/${presentTomorrow}).`);
    }
    if (this.game.settlement.resources.water < presentTomorrow) {
      console.log(`! WARNING: Not enough water for everyone tomorrow (${this.game.settlement.resources.water}/${presentTomorrow}).`);
    }
    
    // Shelter upgrade updates
    if (this.game.settlement.upgradeInProgress) {
      const status = this.game.settlement.getShelterStatus();
      console.log(`- Shelter upgrade in progress: ${status.nextName} (${status.upgradeTimeLeft} days remaining)`);
    }
    
    // Shelter warning if at makeshift level
    if (this.game.settlement.shelterTier === 0) {
      console.log(`! WARNING: Basic shelter needed - settlers will lose health overnight.`);
    }
  }
}

module.exports = EveningPhase;