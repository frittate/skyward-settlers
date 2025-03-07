// engine/phases/status-display.js
const { formatResourceList } = require('../../utils/utils');

class StatusDisplay {
  constructor(gameEngine) {
    this.game = gameEngine;
  }

  displayResourceStatus() {
    const resources = this.game.settlement.resources;
    const production = this.game.settlement.infrastructure.dailyProduction;

    console.log("\nRESOURCE STATUS:");
    for (const [resource, amount] of Object.entries(resources)) {
      let line = `${resource}: ${amount}`;
      if (production[resource]) {
        line += ` (Daily production: ~${production[resource]})`;
      }
      console.log(line);
    }
  }

  displaySettlerStatus() {
    console.log("\nSETTLER STATUS:");
    const criticalSettlers = this.game.settlers.filter(s => 
      !s.busy && (s.health < 50 || s.morale < 50 || s.recovering)
    );

    criticalSettlers.forEach(settler => {
      const status = [];
      if (settler.health < 50) status.push(`health: ${settler.health}/100`);
      if (settler.morale < 50) status.push(`morale: ${settler.morale}/100`);
      if (settler.recovering) status.push(`recovering: ${settler.recoveryDaysLeft} days`);
      
      console.log(`- ${settler.name}: ${status.join(', ')}`);
    });
  }

  displayInfrastructureStatus() {
    const upgrades = this.game.settlement.infrastructure.upgradesInProgress;
    if (upgrades.length === 0) return;

    console.log("\nINFRASTRUCTURE STATUS:");
    upgrades.forEach(upgrade => {
      console.log(`- ${upgrade.name}: ${upgrade.timeLeft}/${upgrade.originalTime} days remaining`);
      console.log(`  Mechanics assigned: ${upgrade.mechanics.join(', ')}`);
    });
  }

  displayExpeditionStatus() {
    const expeditions = this.game.expeditions;
    if (expeditions.length === 0) return;

    console.log("\nEXPEDITIONS STATUS:");
    expeditions.forEach(exp => {
      console.log(`- ${exp.settler.name} (Day ${exp.currentDay}/${exp.duration}): ${exp.radius} radius`);
    });
  }
}

module.exports = StatusDisplay;
