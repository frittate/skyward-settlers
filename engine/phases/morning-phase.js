
// MORNING PHASE - Modified to apply night effects

// engine/phases/morning-phase.js 
const { printPhaseHeader, formatResourceList } = require('../../utils/utils');
const gameConfig = require('../../config/game-config');
const chalk = require('chalk');

class MorningPhase {
  constructor(gameEngine) {
    this.game = gameEngine;
  }

  async execute() {
    printPhaseHeader("MORNING PHASE: RETURN & REPORT");
    console.log(chalk.blue(`Day ${this.game.day} has begun.`));


    // Add daily hope for survival
    if (this.game.day > 1) {
      // Apply overnight exposure effects first
      await this.applyNightlyEffects();

      const hopeMessage = this.game.updateAllSettlersMorale(
        this.game.settlers,
        gameConfig.hope.hopeChange.daySurvived, 
        "another day survived"
      );
      if (hopeMessage) console.log("\n" + hopeMessage);
    }

    const production = this.game.settlement.processDailyProduction();
    if (production.food > 0 || production.water > 0) {
      console.log(chalk.bold("\n=== INFRASTRUCTURE PRODUCTION ==="));
      if (production.food > 0) {
        console.log(`Gardens produced ${production.food} food.`);
      }
      if (production.water > 0) {
        console.log(`Water collectors gathered ${production.water} water.`);
      }
    }

    await this.processInfrastructureUpgrades();

    // Check for shelter upgrade progress
    await this.processShelterUpgrade();

    // Check for random visitors based on hope
    await this.checkForVisitors();

    // Track consecutive days with sufficient resources
    const stabilityMessage = this.game.settlement.trackResourceStability(this.game.settlers);
    if (stabilityMessage) {
      console.log("\n" + stabilityMessage);
    }

    // Update recovery status for all settlers
    this.game.settlers.forEach(settler => {
      const recoveryMessage = settler.updateRecovery();
      if (recoveryMessage) {
        console.log(recoveryMessage);
      }
    });

    // 1. Check for expedition status reports
    await this.processStatusReports();

    // 2. Process returning expeditions
    await this.processReturningExpeditions();

    // Display settler status changes
    await this.displaySettlerStatus();

    // Display current status after returns
    this.game.displayStatus();

    return this.game.askQuestion("\nPress Enter to continue to Resource Distribution...");
  }

  // Apply nightly exposure effects to settlers (moved from evening phase)
  async applyNightlyEffects() {
    console.log(chalk.bold("\nOVERNIGHT EFFECTS:"));
    
    // Get settlers who are present (not on expeditions)
    const presentSettlers = this.game.settlers.filter(s => !s.busy);
    
    // Apply nightly exposure effects based on shelter level
    const effects = this.game.settlement.applyNightlyExposureEffects(presentSettlers);
    
    // Display effects
    if (Array.isArray(effects)) {
      if (effects.length > 0) {
        console.log("Night Exposure Effects:");
        for (const effect of effects) {
          console.log(`- ${effect}`);
        }
      } else {
        console.log(chalk.green("- All settlers slept comfortably through the night."));
      }
    } else {
      console.log(`- ${effects}`);
    }
    
    // Check settler critical status after night exposure
    this.game.checkCriticalStatus();
  }

  async processInfrastructureUpgrades() {
    const upgradeResults = this.game.settlement.processInfrastructureUpgrades();
    
    if (upgradeResults.completed.length > 0 || upgradeResults.continuing.length > 0) {
      console.log(chalk.bold("\n=== INFRASTRUCTURE UPDATE ==="));
      
      // Report on completed upgrades
      for (const completed of upgradeResults.completed) {
        console.log(chalk.green(`🎉 ${completed.name} construction is complete!`));
        
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
          const hopeMessage = this.game.updateAllSettlersMorale(
            this.game.settlers,
            completed.hopeBonus, 
            `completed ${completed.name}`
          );
          if (hopeMessage) console.log(hopeMessage);
        }
        
        // Show production info
        if (completed.production) {
          const category = completed.category === 'food' ? 'food' : 'water';  
          console.log(`- Will produce ${completed.production.min}-${completed.production.max} ${category} per day.`);
        }
      }
      
      // Report on continuing upgrades
      for (const continuing of upgradeResults.continuing) {
        console.log(`🔨 ${continuing.name} construction continues.`);
        console.log(`- ${continuing.timeLeft} days remaining until completion.`);
        console.log(`- ${continuing.mechanics.join(', ')} ${continuing.mechanics.length > 1 ? 'are' : 'is'} working on the project.`);
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
      console.log(chalk.bold("\n=== SHELTER UPDATE ==="));
      
      if (upgradeResult.complete) {
        console.log(chalk.green(`${upgradeResult.shelterName} construction is complete!`));
        console.log(`Your settlement now has better protection from the elements.`);
        
        if (upgradeResult.hopeBonus) {
          this.game.updateAllSettlersMorale(result.hopeBonus, `completed ${upgradeResult.shelterName}`)

          console.log(upgradeResult.hopeMessage);
        }
        
        console.log(`${upgradeResult.mechanic} is now available for other tasks.`);
        
        // Special message for first upgrade (Basic Tents)
        if (upgradeResult.shelterTier === 1) {
          console.log("\nWith Basic Tents, your settlers will no longer lose health from exposure at night!");
        }
        
      } else {
        console.log(`${upgradeResult.shelterName} construction continues.`);
        console.log(`${upgradeResult.daysLeft} days remaining until completion.`);
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

    console.log(chalk.bold("\n=== VISITOR ARRIVED ==="));
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
      console.log(chalk.bold("\nEXPEDITION STATUS REPORTS:"));
      for (const expedition of activeExpeditions) {
        console.log(`- ${expedition.statusReport}`);
      }
    }
  }

  // Process returning expeditions
  async processReturningExpeditions() {
    const returnedExpeditions = this.game.expeditions.filter(exp => exp.returnDay === this.game.day);

    if (returnedExpeditions.length > 0) {
      console.log(chalk.bold("\nRETURNING EXPEDITIONS:"));

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
    console.log(chalk.bold("\n=== SURVIVOR FOUND ==="));
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
    console.log(chalk.bold("\nSETTLER STATUS:"));
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