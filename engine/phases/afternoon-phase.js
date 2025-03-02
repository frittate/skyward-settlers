// engine/phases/afternoon-phase.js
const { printPhaseHeader } = require('../../utils/utils');
const Expedition = require('../../models/expedition');

class AfternoonPhase {
  constructor(gameEngine) {
    this.game = gameEngine;
  }

  async execute() {
    printPhaseHeader("AFTERNOON PHASE: TASK ASSIGNMENT");

    // Get available (non-busy and non-recovering) settlers
    const availableSettlers = this.game.settlers.filter(settler => 
      !settler.busy && !settler.recovering
    );

    if (availableSettlers.length === 0) {
      console.log("No settlers available for tasks today.");
      await this.game.askQuestion("\nPress Enter to continue to Evening Summary...");
      return;
    }

    console.log("Available settlers:");
    availableSettlers.forEach((settler, index) => {
      console.log(`${index + 1}. ${settler.name} (${settler.role}) - Health: ${settler.health}, Morale: ${settler.morale}`);
    });

    // Calculate how many settlers we can send on expeditions
    // At least one settler must remain at the settlement
    const availableForExpedition = Math.max(0, this.game.settlers.length - 1 - 
      this.game.settlers.filter(s => s.busy || s.recovering).length);
      
    if (availableForExpedition <= 0) {
      console.log("\nWARNING: You must keep at least one settler at the settlement!");
    }

    // Count of settlers assigned to expeditions this turn
    let expeditionCount = 0;

    // Assign tasks to each available settler
    for (let i = 0; i < availableSettlers.length; i++) {
      const settlerIndex = this.game.settlers.findIndex(s => s.name === availableSettlers[i].name);
      const settler = this.game.settlers[settlerIndex];

      console.log(`\nAssign task to ${settler.name}:`);

      // Only show foraging option if we haven't reached the limit
      if (expeditionCount < availableForExpedition) {
        // Check if emergency foraging is needed
        if (this.game.settlement.resources.food === 0 && this.game.settlement.resources.water === 0) {
          console.log("1. Emergency foraging (desperate measure, no supplies needed)");
        } else {
          console.log("1. Send foraging");
        }
      } else {
        console.log("1. [UNAVAILABLE] Send foraging (must keep at least one settler at settlement)");
      }

      // Only show healing option if there's a medic
      const hasMedic = this.game.settlers.some(s => s.role === 'Medic');
      if (hasMedic && settler.role === 'Medic') {
        console.log("2. Heal (requires medicine and a medic)");
      } else {
        console.log("2. [UNAVAILABLE] Heal (requires medicine and a medic)");
      }
      
      // Only show shelter building option if this settler is a mechanic and there's a possible upgrade
      const canUpgrade = settler.role === 'Mechanic' && 
                         settler.health > 50 && 
                         this.game.settlement.canUpgradeShelter().possible;
      if (canUpgrade) {
        console.log("3. Build shelter (requires mechanic and materials)");
      } else if (settler.role === 'Mechanic') {
        // Show why shelter building is unavailable
        const upgradeStatus = this.game.settlement.canUpgradeShelter();
        console.log(`3. [UNAVAILABLE] Build shelter (${upgradeStatus.reason})`);
      } else {
        console.log("3. [UNAVAILABLE] Build shelter (requires mechanic)");
      }

      console.log("4. Rest");

      const taskChoice = await this.game.askQuestion("Choose task (1-4): ");

      if (taskChoice === '1') { 
        // Foraging - check availability and health
        await this.handleForagingAssignment(settler, expeditionCount, availableForExpedition);
        // If foraging was assigned, increment counter
        if (settler.busy) {
          expeditionCount++;
        }
      } else if (taskChoice === '2') { 
        // Healing
        await this.handleHealingAssignment(settler, hasMedic);
      } else if (taskChoice === '3') {
        // Shelter building
        await this.handleShelterAssignment(settler, canUpgrade);
      } else { 
        // Rest or default
        const restResult = settler.rest();
        console.log(restResult);
      }
    }

    await this.game.askQuestion("\nPress Enter to continue to Evening Summary...");
  }

  // Handle shelter building assignment
  async handleShelterAssignment(settler, canUpgrade) {
    if (!canUpgrade) {
      if (settler.role !== 'Mechanic') {
        console.log(`Only a mechanic can build shelter, and ${settler.name} is a ${settler.role}!`);
      } else if (settler.health <= 50) {
        console.log(`${settler.name} needs better health to work on shelter construction.`);
      } else {
        const upgradeStatus = this.game.settlement.canUpgradeShelter();
        console.log(`Cannot build shelter: ${upgradeStatus.reason}`);
      }
      
      console.log(`${settler.name} will rest instead.`);
      const restResult = settler.rest();
      console.log(restResult);
      return;
    }
    
    // Get upgrade details
    const upgradeStatus = this.game.settlement.canUpgradeShelter();
    const nextTierName = this.game.settlement.shelterConfig[upgradeStatus.nextTier].name;
    
    console.log("\nSHELTER UPGRADE:");
    console.log(`- Current shelter: ${this.game.settlement.getShelterName()}`);
    console.log(`- Upgrade to: ${nextTierName}`);
    console.log(`- Materials required: ${upgradeStatus.materialsNeeded}`);
    console.log(`- Build time: ${upgradeStatus.timeNeeded} days`);
    
    if (upgradeStatus.nextTier === 1) {
      console.log("- Benefit: Settlers will no longer lose health from exposure at night!");
    }
    
    const confirmUpgrade = await this.game.askQuestion("Begin shelter upgrade? (y/n): ");
    
    if (confirmUpgrade.toLowerCase() === 'y') {
      // Start the upgrade
      const result = this.game.settlement.startShelterUpgrade(settler);
      
      if (result.success) {
        this.game.logEvent(`${settler.name} has begun building ${nextTierName}. Used ${result.materials} materials and will take ${upgradeStatus.timeNeeded} days to complete.`);
      } else {
        console.log(result.message);
        console.log(`${settler.name} will rest instead.`);
        const restResult = settler.rest();
        console.log(restResult);
      }
    } else {
      console.log(`${settler.name} will rest instead.`);
      const restResult = settler.rest();
      console.log(restResult);
    }
  }

  // Handle foraging expedition assignment
  async handleForagingAssignment(settler, currentExpeditions, maxExpeditions) {
    if (currentExpeditions >= maxExpeditions) {
      console.log("You must keep at least one settler at the settlement!");
      console.log(`${settler.name} will rest instead.`);
      const restResult = settler.rest();
      console.log(restResult);
      return;
    } 
    
    if (settler.health <= 20) {
      console.log(`${settler.name} is too unhealthy to forage.`);
      console.log(`${settler.name} will rest instead.`);
      const restResult = settler.rest();
      console.log(restResult);
      return;
    }

    // Check if this is an emergency foraging situation
    const isEmergency = this.game.settlement.resources.food === 0 && 
                         this.game.settlement.resources.water === 0;

    if (isEmergency) {
      await this.handleEmergencyForaging(settler);
    } else {
      await this.handleRegularForaging(settler);
    }
  }

  // Handle emergency foraging expeditions
  async handleEmergencyForaging(settler) {
    console.log("\nEMERGENCY FORAGING:");
    console.log("- 1 day expedition");
    console.log("- No supplies needed");
    console.log("- High risk of failure (70%)");
    console.log("- Low resource return if successful");

    const confirmEmergency = await this.game.askQuestion("Proceed with emergency foraging? (y/n): ");

    if (confirmEmergency.toLowerCase() === 'y') {
      // Create emergency expedition
      const expedition = new Expedition(settler, 'emergency');
      const returnDay = this.game.day + 1; // Always 1 day
      expedition.returnDay = returnDay;

      // Process expedition events and resources
      expedition.processExpedition(this.game.eventSystem);

      // Mark settler as busy
      settler.busy = true;
      settler.busyUntil = returnDay;

      // Add to active expeditions
      this.game.expeditions.push(expedition);

      this.game.logEvent(`${settler.name} set out on an emergency foraging mission. They should return tomorrow.`);
    } else {
      console.log(`${settler.name} will rest instead.`);
      const restResult = settler.rest();
      console.log(restResult);
    }
  }

  // Handle regular foraging expeditions
  async handleRegularForaging(settler) {
    console.log("\nChoose expedition radius:");
    console.log("1. Small (2-3 days, costs 1 food & 1 water)");
    console.log("2. Medium (3-5 days, costs 2 food & 2 water)");
    console.log("3. Large (5-7 days, costs 3 food & 3 water)");

    const radiusChoice = await this.game.askQuestion("Select radius (1-3): ");
    let radius;

    switch(radiusChoice) {
      case '1':
        radius = 'small';
        break;
      case '2':
        radius = 'medium';
        break;
      case '3':
        radius = 'large';
        break;
      default:
        radius = 'small';
    }

    // Create a new expedition with randomized duration
    const expedition = new Expedition(settler, radius);

    // Check if we have enough supplies for the expedition
    if (this.game.settlement.resources.food >= expedition.supplyCost.food && 
        this.game.settlement.resources.water >= expedition.supplyCost.water) {

      // Deduct the supplies
      this.game.settlement.removeResource('food', expedition.supplyCost.food);
      this.game.settlement.removeResource('water', expedition.supplyCost.water);

      const returnDay = this.game.day + expedition.duration;
      expedition.returnDay = returnDay;

      // Process expedition events and resources
      expedition.processExpedition(this.game.eventSystem);

      // Mark settler as busy
      settler.busy = true;
      settler.busyUntil = returnDay;

      // Add to active expeditions
      this.game.expeditions.push(expedition);

      // Don't reveal return day to increase tension
      this.game.logEvent(`${settler.name} set out on a ${radius} radius expedition with ${expedition.supplyCost.food} food and ${expedition.supplyCost.water} water.`);
    } else {
      console.log(`Not enough supplies! This expedition requires ${expedition.supplyCost.food} food and ${expedition.supplyCost.water} water.`);
      console.log(`${settler.name} will rest instead.`);
      const restResult = settler.rest();
      console.log(restResult);
    }
  }

  // Handle healing assignment
  async handleHealingAssignment(settler, hasMedic) {
    if (hasMedic && settler.role === 'Medic' && this.game.settlement.resources.meds > 0) {
      console.log("Who do you want to heal?");
      this.game.settlers.forEach((s, idx) => {
        console.log(`${idx + 1}. ${s.name} - Health: ${s.health}${s.wounded ? ' [WOUNDED]' : ''}`);
      });
      
      const targetChoice = await this.game.askQuestion("Choose settler to heal (1-" + this.game.settlers.length + "): ");
      const targetIndex = parseInt(targetChoice, 10) - 1;

      if (targetIndex >= 0 && targetIndex < this.game.settlers.length) {
        await this.healSettler(settler, targetIndex);
      } else {
        console.log("Invalid choice, settler will rest instead.");
        const restResult = settler.rest();
        console.log(restResult);
      }
    } else {
      if (!hasMedic) {
        console.log("You need a medic to heal settlers!");
      } else if (settler.role !== 'Medic') {
        console.log(`Only a medic can heal settlers, and ${settler.name} is a ${settler.role}!`);
      } else {
        console.log("No medicine available!");
      }
      console.log(`${settler.name} will rest instead.`);
      const restResult = settler.rest();
      console.log(restResult);
    }
  }

  // Heal a settler using medicine
  async healSettler(medic, targetIndex) {
    const target = this.game.settlers[targetIndex];

    if (this.game.settlement.resources.meds > 0) {
      this.game.settlement.removeResource('meds', 1);
      
      // Apply healing
      const healResult = target.heal(1, medic);
      
      let healMessage = `${medic.name} used 1 medicine to heal ${target.name}. Health improved from ${target.health - healResult.healthGained} to ${target.health}.`;
      
      if (healResult.curedWound) {
        healMessage += ` ${target.name} is no longer wounded.`;
      }

      this.game.logEvent(healMessage);
      return true;
    } else {
      console.log("Not enough medicine!");
      return false;
    }
  }
}

module.exports = AfternoonPhase;