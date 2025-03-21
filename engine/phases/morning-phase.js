
// MORNING PHASE - Modified to apply night effects

// engine/phases/morning-phase.js 
const { printPhaseHeader, formatResourceList } = require('../../utils/utils');
const gameConfig = require('../../config/game-config');

class MorningPhase {
  constructor(gameEngine) {
    this.game = gameEngine;
  }

  async execute() {
    printPhaseHeader("MORNING PHASE");

    console.log(`Day ${this.game.day} has begun.`);

    printPhaseHeader("SETTLEMENT STATUS");
    this.game.displaySettlerStatus()
    this.game.displayResourcesStatus()
    this.game.displaySettlementStatus()    

    if (this.game.day > 1) {
      printPhaseHeader("NIGHT EFFECTS");
      this.applyNightlyEffects()
      this.applyNightSurvivedHope()


      // Update recovery status for all settlers
      this.game.settlers.forEach(settler => {
        const recoveryMessage = settler.updateRecovery();
        if (recoveryMessage) {
          console.log(recoveryMessage);
        }
      });
      
      // Get output of buildings
      this.getInfrastructureProduction();

      // Process returning expeditions
      printPhaseHeader("RETURNING EXPEDITIONS");
      await this.processReturningExpeditions();
      
      // Check for random visitors based on hope
      await this.checkForSurvivors();

      // Show buildings that are being built
      await this.getCurrentInfrastructureProgress();

      // Track consecutive days with sufficient resources
      const stabilityMessage = this.game.settlement.trackResourceStability(this.game.settlers);
      if (stabilityMessage) {
        console.log("\n" + stabilityMessage);
      }
    }

    this.game.displayResourcesStatus()

    return this.game.askQuestion("\nPress Enter to continue to Resource Distribution...");
  }

  // Apply nightly exposure effects to settlers (moved from evening phase)
  applyNightlyEffects() {
     // Get settlers who are present (not on expeditions)
     const presentSettlers = this.game.settlers.filter(settler => settler.activity !== 'expedition');

     console.log(this.game.settlement.applyNightlyExposure(presentSettlers))
  }

  applyNightSurvivedHope() {
    const hopeMessages = this.game.updateAllSettlersMorale(
      gameConfig.hope.hopeChange.daySurvived, 
      "another day survived"
    );
    if (hopeMessages) {
      console.log(hopeMessages);
    }
  }

  getInfrastructureProduction() {
    const production = this.game.settlement.processDailyProduction();
  
    if (production.food > 0 || production.water > 0) {
      printPhaseHeader("PRODUCTION");

      if (production.food > 0) {
        console.log(`${production.food} food could be harvested from the ${production.foodSource} today.`);
      }
      
      if (production.water > 0) {
        console.log(`${production.water} water could be gathered from the ${production.waterSource} today.`);
      }
    }
  }
  
  async getCurrentInfrastructureProgress() {
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
            mechanic.activity = '';
            mechanic.busyUntil = 0;
            console.log(`- ${mechanic.name} is now available for other tasks.`);
          }
        }
        
        // Add hope bonus
        if (completed.hopeBonus) {
          const hopeMessage = this.game.updateAllSettlersMorale(
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
  

  // Check for random visitor appearance based on hope
  async checkForSurvivors() {
    const chance = this.game.settlement.getVisitorChance();
    if (chance > 0 && Math.random() * 100 < chance) {
      await this.handleSurvivor(false);
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
        settler.activity = '';

        // Set recovery period
        settler.recovering = true;
        settler.recoveryDaysLeft = expedition.recoverTime;

        // Add resources to settlement
        for (const [resource, amount] of Object.entries(expedition.resources)) {
          if (amount > 0) {
            this.game.settlement.addResource(resource, amount);
          }
        }

        // Check if expedition found ANY resources by summing all resource values
        const totalResources = Object.values(expedition.resources).reduce((sum, amount) => sum + amount, 0);

        await this.createExpeditionReport(expedition, totalResources);
        
        // Check if they found a survivor
        if (expedition.foundSurvivor && expedition.survivor) {
          await this.handleSurvivor(true);
        }

        // Report expedition events
        if (expedition.events.length > 0) {
          console.log(`\n  ${settler.name}'s Expedition Events:`);
          for (const event of expedition.events) {
            console.log(`  Day ${event.day}: ${event.name} - ${event.description}`);
            console.log(`    ${event.result}`);
          }
        }

        if (totalResources > 0) {
          const hopeMessage = this.game.updateAllSettlersMorale(
            gameConfig.hope.hopeChange.successfulExpedition, 
            "successful expedition"
          );
          if (hopeMessage) this.game.logEvent(hopeMessage);

          if (expedition.jackpotFind) {
            const exceptionalHopeMessage = this.game.updateAllSettlersMorale(
              gameConfig.hope.hopeChange.jackpotFind,
              "found more than expected"
            );
            if (exceptionalHopeMessage) this.game.logEvent(exceptionalHopeMessage);
          }
        } else {
          const failedHopeMessage = this.game.updateAllSettlersMorale(
            gameConfig.hope.hopeChange.failedExpedition,
            "failed expedition"
          );
          if (failedHopeMessage) this.game.logEvent(failedHopeMessage);
        }
      }

      // Remove processed expeditions
      this.game.expeditions = this.game.expeditions.filter(exp => exp.returnDay !== this.game.day);
    } else {
      console.log("No expeditions returning today.");
    }
  }

  // Create expedition report
  async createExpeditionReport(expedition, totalResources) {
    const settler = expedition.settler;
        
    if (totalResources > 0) {
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

      let message = `- ${settler.name} has returned from the ${expedition.radius} radius with ${resourceDetails}.`;
      
      if (expedition.jackpotFind) {
        message += " They found an exceptional cache of supplies!"; 
      }
      
      message += ` They need ${expedition.recoverTime} day(s) to recover.`;
      this.game.logEvent(message);
    } else {
      // Should rarely happen with our updated resource generation, but handle it just in case
      this.game.logEvent(`- ${settler.name} has returned from the ${expedition.radius} radius with no resources. The expedition was a failure. They need ${expedition.recoverTime} day(s) to recover.`);   
    }
  }

  // Handle found survivor
  async handleSurvivor(isFromExpedition) {
    // Always generate the survivor inside this function.
    // (Assuming generateSurvivor() is a unified method for generating survivors.)
    const survivor = this.game.generateSurvivor();
  
    // Determine messages based on how the survivor arrived.
    const status = isFromExpedition ? 'FOUND' : 'ARRIVED';
    const arrivalMsg = isFromExpedition ? 'found on an expedition' : 'came on their own';
  
    console.log(`\n=== SURVIVOR ${status} ===`);
    console.log(`${survivor.name}, a ${survivor.role}, was ${arrivalMsg}!`);
    console.log(`Health: ${survivor.health}, Morale: ${survivor.morale}`);
  
    const giftString = formatResourceList(survivor.gift);
    if (giftString) {
      console.log(`They're offering to share their remaining supplies: ${giftString}`);
    }
  
    if (survivor.role === 'Medic') {
      console.log("A medic can heal wounded settlers and boost overall health!");
    } else if (survivor.role === 'Mechanic') {
      console.log("A mechanic helps you build and upgrade structures when materials are available!");
    }
  
    // Ask if the player wants to accept the survivor.
    const accept = await this.game.askQuestion(`Do you want to accept ${survivor.name} into your settlement? (y/n): `);
    if (accept.toLowerCase() === 'y') {
      const Settler = require('../../models/settler');
      const newSettler = new Settler(survivor.name, survivor.role, survivor.health, survivor.morale);
      this.game.settlers.push(newSettler);
  
      // Add any gifts to the settlement's resources.
      for (const [resource, amount] of Object.entries(survivor.gift)) {
        if (amount > 0) {
          this.game.settlement.addResource(resource, amount);
        }
      }
  
      this.game.logEvent(`${survivor.name} (${survivor.role}) has joined the settlement!`);
      if (giftString) {
        this.game.logEvent(`${survivor.name} contributed ${giftString} to the community supplies.`);
      }
      if (survivor.role === 'Medic') {
        this.game.logEvent("You now have a medic who can heal wounded settlers!");
      }
      if (survivor.role === 'Mechanic') {
        this.game.logEvent("You now have a mechanic who can build and upgrade shelter!");
      }
  
      // Update hope based on arrival type.
      const hopeChange = isFromExpedition
        ? gameConfig.hope.hopeChange.rescuedSurvivor
        : gameConfig.hope.hopeChange.newSettler;
      const eventText = isFromExpedition ? "rescued survivor" : "new settler joined";
      const hopeMessage = this.game.updateAllSettlersMorale(hopeChange, eventText);
      if (hopeMessage) this.game.logEvent(hopeMessage);
    } else {
      this.game.logEvent(`You decided not to accept ${survivor.name} into the settlement.`);
      const hopeMessage = this.game.updateAllSettlersMorale(
        gameConfig.hope.hopeChange.turnedAwaySurvivor,
        "turned away survivor"
      );
      if (hopeMessage) this.game.logEvent(hopeMessage);
    }
  }
}

module.exports = MorningPhase;
