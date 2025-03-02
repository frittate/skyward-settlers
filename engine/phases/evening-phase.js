// engine/phases/evening-phase.js
const { printPhaseHeader } = require('../../utils/utils');

class EveningPhase {
  constructor(gameEngine) {
    this.game = gameEngine;
  }

  async execute() {
    printPhaseHeader("EVENING PHASE: DAY SUMMARY");

    console.log(`Day ${this.game.day} is complete.`);

    // Instead of repeating all status information, just show a compact summary
    // of changes from the day's activities
    console.log("\nDAY SUMMARY:");
    
    // Summarize expedition status
    const ongoingExpeditions = this.game.expeditions.length;
    if (ongoingExpeditions > 0) {
      console.log(`- ${ongoingExpeditions} active expedition${ongoingExpeditions > 1 ? 's' : ''}`);
    }
    
    // Summarize infrastructure progress
    // Note: Using getUpgradesInProgress instead of getUpgradesInProgressSummary
    const upgradesInProgress = this.game.settlement.infrastructure.upgradesInProgress;
    if (upgradesInProgress.length > 0) {
      console.log(`- ${upgradesInProgress.length} infrastructure project${upgradesInProgress.length > 1 ? 's' : ''} in progress`);
      upgradesInProgress.forEach(upgrade => {
        console.log(`  ${upgrade.name}: ${upgrade.timeLeft}/${upgrade.originalTime} days remaining`);
      });
    }
    
    // Shelter upgrade summary
    if (this.game.settlement.upgradeInProgress) {
      const nextTier = this.game.settlement.shelterTier + 1;
      const shelterName = this.game.settlement.shelterConfig[nextTier].name;
      console.log(`- Building ${shelterName}: ${this.game.settlement.upgradeTimeLeft} days remaining`);
    }

    // Show any settlers with critical health/morale
    const criticalSettlers = this.game.settlers.filter(s => s.health < 30 || s.morale < 30);
    if (criticalSettlers.length > 0) {
      console.log("\nWARNING: Settlers in critical condition:");
      criticalSettlers.forEach(settler => {
        let issues = [];
        if (settler.health < 30) issues.push(`health critical (${settler.health})`);
        if (settler.morale < 30) issues.push(`morale critical (${settler.morale})`);
        console.log(`- ${settler.name}: ${issues.join(', ')}`);
      });
    }

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
    
    // Shelter warning if at makeshift level
    if (this.game.settlement.shelterTier === 0) {
      console.log(`! WARNING: Basic shelter needed - settlers will lose health overnight.`);
    }
  }
}

module.exports = EveningPhase;