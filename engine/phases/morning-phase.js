// engine/phases/morning-phase.js
const { printPhaseHeader, formatResourceList } = require('../../utils/utils');
const gameConfig = require('../../config/game-config');

class MorningPhase {
  constructor(gameEngine) {
    this.game = gameEngine;
  }

  async execute() {
    printPhaseHeader("MORNING PHASE: RETURN & REPORT");
    console.log(`Day ${this.game.day} has begun.`);

    // Add daily hope for survival
    if (this.game.day > 1) {
      console.log("\n=== DAILY SURVIVAL BOOST ===");
      
      // Apply small morale boost to each settler for surviving another day
      const dailyMoraleBoost = gameConfig.dailySurvivalMoraleBoost;
            
      let boostMessage = "Another day survived! ";
      let settlersMentioned = 0;
      
      // Apply morale boost to each settler
      for (const settler of this.game.settlers) {
        const oldMorale = settler.morale;
        settler.morale = Math.min(100, settler.morale + dailyMoraleBoost);
        
        // Only mention if morale actually increased (might be at 100 already)
        if (settler.morale > oldMorale) {
          // Only mention up to 3 settlers directly to avoid cluttering the log
          if (settlersMentioned < 3) {
            boostMessage += `${settler.name} (+${dailyMoraleBoost} morale), `;
            settlersMentioned++;
          }
        }
      }
      
      // Finalize message format
      if (settlersMentioned > 0) {
        // Remove trailing comma and space
        boostMessage = boostMessage.slice(0, -2);
        
        // Add summary if there are more settlers than we mentioned
        if (settlersMentioned < this.game.settlers.length) {
          const remaining = this.game.settlers.length - settlersMentioned;
          boostMessage += ` and ${remaining} other settler${remaining > 1 ? 's' : ''}`;
        }
        
        boostMessage += ` gained morale from surviving another day.`;
        console.log(boostMessage);
      }
    }
  

    // Infrastructure production
    await this.processInfrastructureProduction();

    // Check for infrastructure upgrades
    await this.processInfrastructureUpgrades();

    // Check for shelter upgrade progress
    await this.processShelterUpgrade();

    const hopeFromMorale = this.game.settlement.calculateHopeFromMorale(this.game.settlers);
    if (hopeFromMorale) {
      console.log(`Settlement hope ${hopeFromMorale > 0 ? 'increased' : 'decreased'} based on settler morale.`);
    }

    // Check for random visitors based on hope
    await this.checkForVisitors();

    // Track consecutive days with sufficient resources
    const stabilityMessage = this.game.settlement.trackResourceStability(this.game.settlers);
    if (stabilityMessage) {
      console.log("\n" + stabilityMessage);
    }

    // Process settlers who are recovering
    this.processRecovery();

    // Process status reports from expedition
    await this.processStatusReports();

    // Process returning expeditions
    await this.processReturningExpeditions();

    // Display current status after all morning events
    this.game.displayStatus();

    return this.game.askQuestion("\nPress Enter to continue to Resource Distribution...");
  }

  // Process infrastructure production
  async processInfrastructureProduction() {
    const production = this.game.settlement.processDailyProduction();
    if (production.food > 0 || production.water > 0) {
      console.log("\n=== INFRASTRUCTURE PRODUCTION ===");
      if (production.food > 0) {
        console.log(`Gardens produced ${production.food} food.`);
      }
      if (production.water > 0) {
        console.log(`Water collectors gathered ${production.water} water.`);
      }
    }
  }

  // Process settlers who are recovering
  processRecovery() {
    const recoveringSettlers = this.game.settlers.filter(s => s.recovering);
    
    if (recoveringSettlers.length > 0) {
      console.log("\n=== SETTLER RECOVERY ===");
      
      recoveringSettlers.forEach(settler => {
        const recoveryMessage = settler.updateRecovery();
        if (recoveryMessage) {
          console.log(recoveryMessage);
        }
      });
    }
  }

  async processInfrastructureUpgrades() {
    const upgradeResults = this.game.settlement.processInfrastructureUpgrades();
    
    if (upgradeResults.completed.length > 0 || upgradeResults.continuing.length > 0) {
      console.log("\n=== INFRASTRUCTURE UPDATE ===");
      
      // Report on completed upgrades
      for (const completed of upgradeResults.completed) {
        console.log(`🎉 ${completed.name} construction is complete!`);
        
        // Free up the mechanics
        for (const mechanicName of completed.mechanics) {
          const mechanic = this.game.settlers.find(s => s.name === mechanicName);
          if (mechanic) {
            mechanic.busy = false;
            mechanic.busyUntil = 0;
            console.log(`- ${mechanic.name} is now available for other tasks.`);
          }
        }
        
        // Add hope bonus
        if (completed.hopeBonus) {
          const hopeMessage = this.game.settlement.updateHope(
            completed.hopeBonus, 
            `completed ${completed.name}`
          );
          if (hopeMessage) console.log(hopeMessage);
        }
        
        // Show production info
        if (completed.production) {
          const category = completed.type === 'garden' || completed.type === 'greenhouse' || completed.type === 'hydroponics' 
            ? 'food' 
            : 'water';
            
          console.log(`- Will produce ${completed.production.min}-${completed.production.max} ${category} per day.`);
        }
      }
      
      // Report on continuing upgrades only if there are any
      if (upgradeResults.continuing.length > 0) {
        console.log("\nOngoing construction:");
        for (const continuing of upgradeResults.continuing) {
          console.log(`- ${continuing.name}: ${continuing.timeLeft} days remaining (${continuing.mechanics.join(', ')} working)`);
        }
      }
    }
  }

  // Process shelter upgrade progress if one is ongoing
  async processShelterUpgrade() {
    if (!this.game.settlement.upgradeInProgress) {
      return;
    }

    const upgradeResult = this.game.settlement.processShelterUpgrade();
    
    if (upgradeResult) {
      console.log("\n=== SHELTER UPDATE ===");
      
      if (upgradeResult.complete) {
        console.log(`${upgradeResult.shelterName} construction is complete!`);
        console.log(`Your settlement now has better protection from the elements.`);
        
        if (upgradeResult.hopeMessage) {
          console.log(upgradeResult.hopeMessage);
        }
        
        console.log(`${upgradeResult.mechanic} is now available for other tasks.`);
        
        // Special message for first upgrade (Basic Tents)
        if (upgradeResult.shelterTier === 1) {
          console.log("\nWith Basic Tents, your settlers will no longer lose health from exposure at night!");
        }
      } else {
        console.log(`${upgradeResult.shelterName} construction continues: ${upgradeResult.daysLeft} days remaining.`);
        console.log(`${upgradeResult.mechanic} is still working on the project.`);
      }
    }
  }

  // Check for random visitor appearance based on hope
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
      const hopeMessage = this.game.settlement.updateHope(
        gameConfig.hope.hopeChange.newSettler, 
        "new settler joined"
      );
      if (hopeMessage) this.game.logEvent(hopeMessage);
    } else {
      this.game.logEvent(`You decided not to accept ${visitor.name} into the settlement.`);
      // Small hope penalty for turning someone away
      const hopeMessage = this.game.settlement.updateHope(
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
      console.log("\n=== EXPEDITION STATUS REPORTS ===");
      for (const expedition of activeExpeditions) {
        console.log(`- ${expedition.statusReport}`);
      }
    }
  }

  // Process returning expeditions
  async processReturningExpeditions() {
    const returnedExpeditions = this.game.expeditions.filter(exp => exp.returnDay === this.game.day);

    if (returnedExpeditions.length > 0) {
      console.log("\n=== RETURNING EXPEDITIONS ===");

      for (const expedition of returnedExpeditions) {
        const settler = expedition.settler;
        settler.busy = false;
        settler.busyUntil = 0;

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
    if (Object.values(expedition.resources).some(val => val > 0)) {
      const moraleBoost = expedition.jackpotFind ? 25 : 15;
      settler.morale = Math.min(100, settler.morale + moraleBoost);

      let message = `- ${settler.name} has returned from the ${expedition.radius} radius with ${resourceString || "no resources"}. (+${moraleBoost} morale from successful expedition)`;
      
      if (expedition.jackpotFind) {
        message += " They found an exceptional cache of supplies!";
        const hopeMessage = this.game.settlement.updateHope(
          gameConfig.hope.hopeChange.exceptionalFind, 
          "exceptional resource find"
        );
        if (hopeMessage) this.game.logEvent(hopeMessage);
      } else {
        const hopeMessage = this.game.settlement.updateHope(
          gameConfig.hope.hopeChange.successfulExpedition, 
          "successful expedition"
        );
        if (hopeMessage) this.game.logEvent(hopeMessage);
      }
      
      message += ` They need ${expedition.recoverTime} days to recover.`;
      this.game.logEvent(message);
    } else {
      this.game.logEvent(`- ${settler.name} has returned from the ${expedition.radius} radius with no resources. The expedition was a failure. They need ${expedition.recoverTime} days to recover.`);
      
      const hopeMessage = this.game.settlement.updateHope(
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
      const hopeMessage = this.game.settlement.updateHope(
        gameConfig.hope.hopeChange.rescuedSurvivor, 
        "rescued survivor"
      );
      if (hopeMessage) this.game.logEvent(hopeMessage);
    } else {
      this.game.logEvent(`You decided not to accept ${survivor.name} into the settlement.`);
      // Small hope penalty for turning someone away
      const hopeMessage = this.game.settlement.updateHope(
        gameConfig.hope.hopeChange.turnedAwaySurvivor, 
        "turned away survivor"
      );
      if (hopeMessage) this.game.logEvent(hopeMessage);
    }
  }
}

module.exports = MorningPhase;