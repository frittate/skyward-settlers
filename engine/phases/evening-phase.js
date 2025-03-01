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

    // Preview tomorrow's events
    await this.displayTomorrowPreview();

    // Advance day
    this.game.day++;

    const continueGame = await this.game.askQuestion("\nPress Enter to advance to next day (or type 'quit' to end): ");
    return continueGame.toLowerCase() !== 'quit';
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
  }
}

module.exports = EveningPhase;