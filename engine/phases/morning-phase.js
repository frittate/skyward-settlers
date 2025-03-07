// engine/phases/morning-phase.js
const { printPhaseHeader } = require('../../utils/utils');
const StatusDisplay = require('./status-display');

class MorningPhase {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.statusDisplay = new StatusDisplay(gameEngine);
  }

  async execute() {
    printPhaseHeader("MORNING PHASE: RETURN & REPORT");
    console.log(`Day ${this.game.day} has begun.`);

    // Process overnight effects first
    if (this.game.day > 1) {
      await this.processNightEffects();
    }

    // Process infrastructure and production
    const { upgradeResults, production } = this.game.settlement.processDailyInfrastructure();
    this.reportInfrastructureResults(upgradeResults, production);

    // Process expeditions and visitors
    await this.processExpeditions();
    await this.checkForVisitors();

    // Display current status
    this.statusDisplay.displayResourceStatus();
    this.statusDisplay.displaySettlerStatus();
    this.statusDisplay.displayInfrastructureStatus();
    this.statusDisplay.displayExpeditionStatus();

    return this.game.askQuestion("\nPress Enter to continue to Resource Distribution...");
  }

  async processNightEffects() {
    console.log("\nOVERNIGHT EFFECTS:");
    const presentSettlers = this.game.settlers.filter(s => !s.busy);
    const shelterProtection = this.game.settlement.getShelterProtection();

    let effects = [];
    if (shelterProtection < 100) {
      const exposureDamage = Math.round((100 - shelterProtection) / 20);
      presentSettlers.forEach(settler => {
        settler.health = Math.max(0, settler.health - exposureDamage);
        effects.push(`${settler.name} lost ${exposureDamage} health from exposure`);
      });
    }

    if (effects.length > 0) {
      effects.forEach(effect => console.log(`- ${effect}`));
    } else {
      console.log("- All settlers slept comfortably through the night.");
    }

    this.game.checkCriticalStatus();
  }

  reportInfrastructureResults(upgradeResults, production) {
    // Report production
    if (production.food || production.water) {
      console.log("\n=== INFRASTRUCTURE PRODUCTION ===");
      if (production.food) console.log(`Gardens produced ${production.food} food.`);
      if (production.water) console.log(`Water collectors gathered ${production.water} water.`);
    }

    // Report upgrades
    const { completed, continuing } = upgradeResults;
    if (completed.length || continuing.length) {
      console.log("\n=== INFRASTRUCTURE UPDATE ===");
      
      // Report completed upgrades
      completed.forEach(upgrade => {
        console.log(`🎉 ${upgrade.name} completed.`);
        upgrade.mechanics.forEach(mechanic => {
          const settler = this.game.settlers.find(s => s.name === mechanic);
          if (settler) settler.busy = false;
        });
        
        if (upgrade.hopeBonus) {
          const msg = this.game.updateAllSettlersMorale(
            this.game.settlers, 
            upgrade.hopeBonus, 
            `completed ${upgrade.name}`
          );
          if (msg) console.log(msg);
        }
      });

      // Report continuing upgrades
      continuing.forEach(upgrade => {
        console.log(`🔨 ${upgrade.name}: ${upgrade.timeLeft} days remaining.`);
      });
    }
  }

  async processExpeditions() {
    // Process expedition status reports
    const activeExpeditions = this.game.expeditions.filter(exp => 
      exp.statusReportDay === this.game.day && exp.statusReport
    );

    if (activeExpeditions.length > 0) {
      console.log("\nEXPEDITION STATUS REPORTS:");
      activeExpeditions.forEach(expedition => {
        console.log(`- ${expedition.statusReport}`);
      });
    }

    // Process returning expeditions
    const returnedExpeditions = this.game.expeditions.filter(exp => 
      exp.returnDay === this.game.day
    );

    if (returnedExpeditions.length > 0) {
      console.log("\nRETURNING EXPEDITIONS:");
      for (const expedition of returnedExpeditions) {
        await this.processExpeditionReturn(expedition);
      }
      
      // Remove processed expeditions
      this.game.expeditions = this.game.expeditions.filter(exp => 
        exp.returnDay !== this.game.day
      );
    }
  }

  async processExpeditionReturn(expedition) {
    const settler = expedition.settler;
    settler.busy = false;
    settler.recovering = true;
    settler.recoveryDaysLeft = expedition.recoverTime;

    // Add resources to settlement
    Object.entries(expedition.resources).forEach(([resource, amount]) => {
      if (amount > 0) {
        this.game.settlement.addResource(resource, amount);
      }
    });

    // Report expedition results
    this.reportExpeditionResults(expedition);

    // Handle found survivor if any
    if (expedition.foundSurvivor && expedition.survivor) {
      await this.handleFoundSurvivor(expedition.survivor);
    }
  }

  reportExpeditionResults(expedition) {
    const settler = expedition.settler;
    const totalResources = Object.values(expedition.resources)
      .reduce((sum, amount) => sum + amount, 0);

    if (totalResources > 0) {
      const moraleBoost = expedition.jackpotFind ? 25 : 15;
      settler.morale = Math.min(100, settler.morale + moraleBoost);

      // Create resource breakdown
      const resourceDetails = Object.entries(expedition.resources)
        .filter(([_, amount]) => amount > 0)
        .map(([type, amount]) => `${amount} ${type}`)
        .join(', ');

      let message = `- ${settler.name} has returned from the ${expedition.radius} radius with ${resourceDetails}. `;
      message += `(+${moraleBoost} morale from successful expedition)`;

      if (expedition.jackpotFind) {
        message += " They found an exceptional cache of supplies!";
        this.game.updateAllSettlersMorale(
          this.game.settlers,
          this.game.config.hope.hopeChange.exceptionalFind,
          "exceptional resource find"
        );
      } else {
        this.game.updateAllSettlersMorale(
          this.game.settlers,
          this.game.config.hope.hopeChange.successfulExpedition,
          "successful expedition"
        );
      }

      message += ` They need ${expedition.recoverTime} days to recover.`;
      this.game.logEvent(message);
    } else {
      this.game.logEvent(
        `- ${settler.name} has returned from the ${expedition.radius} radius with no resources. ` +
        `The expedition was a failure. They need ${expedition.recoverTime} days to recover.`
      );

      this.game.updateAllSettlersMorale(
        this.game.settlers,
        this.game.config.hope.hopeChange.failedExpedition,
        "failed expedition"
      );
    }

    // Report expedition events
    if (expedition.events.length > 0) {
      console.log(`\n  ${settler.name}'s Expedition Events:`);
      expedition.events.forEach(event => {
        console.log(`  Day ${event.day}: ${event.name} - ${event.description}`);
        console.log(`    ${event.result}`);
      });
    }
  }

  async checkForVisitors() {
    const visitorChance = this.game.settlement.getVisitorChance();
    if (visitorChance > 0 && Math.random() * 100 < visitorChance) {
      await this.handleVisitor();
    }
  }

  // Generate and handle a random visitor for the settlement
  async handleVisitor() {
    // Generate visitor
    const visitor = this.game.settlement.generateVisitor();

    console.log("\n=== VISITOR ARRIVED ===");
    console.log(`${visitor.name}, a ${visitor.role}, was attracted by your settlement's reputation!`);
    console.log(`Health: ${visitor.health}, Morale: ${visitor.morale}`);

    // Show what resources the visitor brings
    const giftString = formatResourceList(visitor.gift);
    if (giftString) {
      console.log(`They're offering to share their remaining supplies: ${giftString}`);
    }

    if (visitor.role === 'Medic') {
      console.log("A medic would allow you to heal wounded settlers and improve health!");
    } else if (visitor.role === 'Mechanic') {
      console.log("A mechanic would allow you to build structures once you have materials!");
    }

    // Ask if player wants to accept the visitor
    const acceptVisitor = await this.game.askQuestion("Do you want to accept this visitor into your settlement? (y/n): ");

    if (acceptVisitor.toLowerCase() === 'y') {
      // Add the visitor to the settlement
      const Settler = require('../../models/settler');
      const newSettler = new Settler(visitor.name, visitor.role, visitor.health, visitor.morale);
      this.game.settlers.push(newSettler);

      // Add their gift to resources
      for (const [resource, amount] of Object.entries(visitor.gift)) {
        if (amount > 0) {
          this.game.settlement.addResource(resource, amount);
        }
      }

      this.game.logEvent(`${visitor.name} (${visitor.role}) has joined the settlement!`);
      if (giftString) {
        this.game.logEvent(`${visitor.name} contributed ${giftString} to the community supplies.`);
      }

      // Special message for medic
      if (visitor.role === 'Medic') {
        this.game.logEvent("You now have a medic who can heal wounded settlers!");
      }
      
      // Special message for mechanic
      if (visitor.role === 'Mechanic') {
        this.game.logEvent("You now have a mechanic who can build and upgrade shelter!");
      }

      // Hope boost for new settler
      const hopeMessage = this.game.updateAllSettlersMorale(
        this.game.settlers,
        gameConfig.hope.hopeChange.newSettler, 
        "new settler joined"
      );
      if (hopeMessage) this.game.logEvent(hopeMessage);
    } else {
      this.game.logEvent(`You decided not to accept ${visitor.name} into the settlement.`);
      // Small hope penalty for turning someone away
      const hopeMessage = this.game.updateAllSettlersMorale(
        this.game.settlers,
        gameConfig.hope.hopeChange.turnedAwaySurvivor, 
        "turned away visitor"
      );
      if (hopeMessage) this.game.logEvent(hopeMessage);
    }
  }

  // Process expedition status reports
  async processStatusReports() {
    const activeExpeditions = this.game.expeditions.filter(exp => 
      exp.statusReportDay === this.game.day && exp.statusReport
    );

    if (activeExpeditions.length > 0) {
      console.log("\nEXPEDITION STATUS REPORTS:");
      for (const expedition of activeExpeditions) {
        console.log(`- ${expedition.statusReport}`);
      }
    }
  }

  // Process returning expeditions
  async processReturningExpeditions() {
    const returnedExpeditions = this.game.expeditions.filter(exp => exp.returnDay === this.game.day);

    if (returnedExpeditions.length > 0) {
      console.log("\nRETURNING EXPEDITIONS:");

      for (const expedition of returnedExpeditions) {
        const settler = expedition.settler;
        settler.busy = false;

        // Set recovery period
        settler.recovering = true;
        settler.recoveryDaysLeft = expedition.recoverTime;

        // Add resources to settlement
        for (const [resource, amount] of Object.entries(expedition.resources)) {
          if (amount > 0) {
            this.game.settlement.addResource(resource, amount);
          }
        }

        // Create resource report
        const resourceString = formatResourceList(expedition.resources);

        // Boost settler morale on successful return with resources
        await this.processExpeditionReturn(expedition, resourceString);

        // Check if they found a survivor
        if (expedition.foundSurvivor && expedition.survivor) {
          await this.handleFoundSurvivor(expedition.survivor);
        }

        // Report expedition events
        if (expedition.events.length > 0) {
          console.log(`\n  ${settler.name}'s Expedition Events:`);
          for (const event of expedition.events) {
            console.log(`  Day ${event.day}: ${event.name} - ${event.description}`);
            console.log(`    ${event.result}`);
          }
        }
      }

      // Remove processed expeditions
      this.game.expeditions = this.game.expeditions.filter(exp => exp.returnDay !== this.game.day);
    } else {
      console.log("\nNo expeditions returning today.");
    }
  }

  // Process expedition return results
  async processExpeditionReturn(expedition, resourceString) {
    const settler = expedition.settler;
    
    // Check if expedition found ANY resources by summing all resource values
    const totalResources = Object.values(expedition.resources).reduce((sum, amount) => sum + amount, 0);
    
    if (totalResources > 0) {
      const moraleBoost = expedition.jackpotFind ? 25 : 15;
      settler.morale = Math.min(100, settler.morale + moraleBoost);

      // Create a more detailed resource breakdown
      let resourceDetails = "";
      if (expedition.resources.food > 0) resourceDetails += `${expedition.resources.food} food, `;
      if (expedition.resources.water > 0) resourceDetails += `${expedition.resources.water} water, `;
      if (expedition.resources.meds > 0) resourceDetails += `${expedition.resources.meds} meds, `;
      if (expedition.resources.materials > 0) resourceDetails += `${expedition.resources.materials} materials, `;
      
      // Remove trailing comma and space
      resourceDetails = resourceDetails.replace(/, $/, "");
      
      // If we have no resources with values > 0, say "no resources"
      if (!resourceDetails) resourceDetails = "no resources";

      let message = `- ${settler.name} has returned from the ${expedition.radius} radius with ${resourceDetails}. (+${moraleBoost} morale from successful expedition)`;
      
      if (expedition.jackpotFind) {
        message += " They found an exceptional cache of supplies!";
        
        // Use updateAllSettlersMorale for exceptional find
        const hopeMessage = this.game.updateAllSettlersMorale(
          this.game.settlers,
          gameConfig.hope.hopeChange.exceptionalFind, 
          "exceptional resource find"
        );
        
        if (hopeMessage) this.game.logEvent(hopeMessage);
      } else {
        // Use updateAllSettlersMorale for successful expedition
        const hopeMessage = this.game.updateAllSettlersMorale(
          this.game.settlers,
          gameConfig.hope.hopeChange.successfulExpedition, 
          "successful expedition"
        );
        
        if (hopeMessage) this.game.logEvent(hopeMessage);
      }
      
      message += ` They need ${expedition.recoverTime} days to recover.`;
      this.game.logEvent(message);
    } else {
      // Should rarely happen with our updated resource generation, but handle it just in case
      this.game.logEvent(`- ${settler.name} has returned from the ${expedition.radius} radius with no resources. The expedition was a failure. They need ${expedition.recoverTime} days to recover.`);
      
      // Use updateAllSettlersMorale for failed expedition
      const hopeMessage = this.game.updateAllSettlersMorale(
        this.game.settlers,
        gameConfig.hope.hopeChange.failedExpedition, 
        "failed expedition"
      );
      
      if (hopeMessage) this.game.logEvent(hopeMessage);
    }
  }

  // Handle found survivor
  async handleFoundSurvivor(survivor) {
    console.log("\n=== SURVIVOR FOUND ===");
    console.log(`${survivor.name}, a ${survivor.role}, was found during the expedition!`);
    console.log(`Health: ${survivor.health}, Morale: ${survivor.morale}`);

    // Show what resources the survivor brings
    const giftString = formatResourceList(survivor.gift);
    if (giftString) {
      console.log(`They're offering to share their remaining supplies: ${giftString}`);
    }

    if (survivor.role === 'Medic') {
      console.log("A medic would allow you to heal wounded settlers and improve health!");
    } else if (survivor.role === 'Mechanic') {
      console.log("A mechanic would allow you to build structures once you have materials!");
    }

    // Ask if player wants to accept the survivor
    const acceptSurvivor = await this.game.askQuestion("Do you want to accept this survivor into your settlement? (y/n): ");

    if (acceptSurvivor.toLowerCase() === 'y') {
      // Add the survivor to the settlement
      const Settler = require('../../models/settler');
      const newSettler = new Settler(survivor.name, survivor.role, survivor.health, survivor.morale);
      this.game.settlers.push(newSettler);

      // Add their gift to resources
      for (const [resource, amount] of Object.entries(survivor.gift)) {
        if (amount > 0) {
          this.game.settlement.addResource(resource, amount);
        }
      }

      this.game.logEvent(`${survivor.name} (${survivor.role}) has joined the settlement!`);
      if (giftString) {
        this.game.logEvent(`${survivor.name} contributed ${giftString} to the community supplies.`);
      }

      // Special message for medic
      if (survivor.role === 'Medic') {
        this.game.logEvent("You now have a medic who can heal wounded settlers!");
      }

      // Hope boost for new survivor
      const hopeMessage = this.game.updateAllSettlersMorale(
        this.game.settlers,
        gameConfig.hope.hopeChange.rescuedSurvivor, 
        "rescued survivor"
      );
      if (hopeMessage) this.game.logEvent(hopeMessage);
    } else {
      this.game.logEvent(`You decided not to accept ${survivor.name} into the settlement.`);
      // Small hope penalty for turning someone away
      const hopeMessage = this.game.updateAllSettlersMorale(
        this.game.settlers,
        gameConfig.hope.hopeChange.turnedAwaySurvivor, 
        "turned away survivor"
      );
      if (hopeMessage) this.game.logEvent(hopeMessage);
    }
  }

  // Display settler status changes
  async displaySettlerStatus() {
    console.log("\nSETTLER STATUS:");
    this.game.settlers.forEach(settler => {
      if (settler.health < 50 && !settler.busy) {
        console.log(`- ${settler.name} is in poor health (${settler.health}/100).`);
      }
      if (settler.morale < 50 && !settler.busy) {
        console.log(`- ${settler.name} has low morale (${settler.morale}/100).`);
      }
    });
  }
}

module.exports = MorningPhase;