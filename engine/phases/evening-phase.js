// engine/phases/evening-phase.js
const { printPhaseHeader } = require('../../utils/utils');
const StatusDisplay = require('./status-display');

class EveningPhase {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.statusDisplay = new StatusDisplay(gameEngine);
  }

  async execute() {
    printPhaseHeader("EVENING PHASE: DAY SUMMARY");
    console.log(`Day ${this.game.day} is complete.`);

    // Display end of day status
    this.statusDisplay.displayResourceStatus();
    this.statusDisplay.displaySettlerStatus();
    this.statusDisplay.displayInfrastructureStatus();
    this.statusDisplay.displayExpeditionStatus();

    // Display night conditions and tomorrow's preview
    await this.displayNightConditions();
    await this.displayTomorrowPreview();

    // Advance day
    this.game.day++;

    const continueGame = await this.game.askQuestion("\nPress Enter to advance to next day (or type 'quit' to end): ");
    return continueGame.toLowerCase() !== 'quit';
  }

  // Display night conditions without applying effects yet
  async displayNightConditions() {
    console.log("\nNIGHT CONDITIONS:");
    
    // Get shelter information using the correct methods
    const shelterName = this.game.settlement.infrastructure.getShelterName();
    const protection = this.game.settlement.infrastructure.getShelterProtection();
    
    console.log(`Shelter: ${shelterName} (${protection}% protection)`);
    
    // Warn about shelter quality but don't apply effects yet
    if (protection === 0) {
      console.log("- The makeshift shelter provides little protection from the elements.");
      console.log("- Settlers may lose health overnight due to exposure.");
    } else {
      console.log(`- The settlement's shelter provides adequate protection for the night.`);
    }
  }

  async displayTomorrowPreview() {
    console.log("\nTOMORROW'S PREVIEW:");

    // Show returning expeditions count
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
    
    const infrastructureProduction = this.game.settlement.infrastructure.dailyProduction;
    if (infrastructureProduction.food > 0 || infrastructureProduction.water > 0) {
      console.log("\nTomorrow's infrastructure production:");
      if (infrastructureProduction.food > 0) {
        console.log(`- Expected food production: ~${infrastructureProduction.food}`);
      }
      if (infrastructureProduction.water > 0) {
        console.log(`- Expected water collection: ~${infrastructureProduction.water}`);
      }
    }

    // Show infrastructure upgrades completing tomorrow
    const upgradesTomorrow = this.game.settlement.infrastructure.upgradesInProgress.filter(
      upgrade => upgrade.timeLeft === 1
    );
    
    if (upgradesTomorrow.length > 0) {
      console.log("\nInfrastructure completing tomorrow:");
      for (const upgrade of upgradesTomorrow) {
        console.log(`- ${upgrade.name} will be completed`);
      }
    }
  }
}

module.exports = EveningPhase;