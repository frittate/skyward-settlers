// engine/phases/afternoon-phase.js
const { printPhaseHeader } = require('../../utils/utils');
const Expedition = require('../../models/expedition');

class AfternoonPhase {
  constructor(gameEngine) {
    this.game = gameEngine;
  }

  // engine/phases/afternoon-phase.js - Updated task assignment section
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

    // Show busy settlers and what they're doing
    const busySettlers = this.game.settlers.filter(settler => settler.busy);
    if (busySettlers.length > 0) {
      console.log("\nCurrently busy settlers:");
      busySettlers.forEach((settler, index) => {
        let activity;
        if (settler.busyUntil === "shelter") {
          activity = "Building shelter infrastructure";
        } else if (settler.busyUntil === "infrastructure") {
          activity = "Building infrastructure";
        } else {
          activity = "On expedition (return day: " + settler.busyUntil + ")";
        }
        console.log(`- ${settler.name} (${settler.role}): ${activity}`);
      });
    }

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

      // Show build infrastructure option if there's a mechanic
      const hasMechanic = this.game.settlers.some(s => s.role === 'Mechanic');
      if (hasMechanic && settler.role === 'Mechanic') {
        console.log("3. Build infrastructure (shelter, food production, water collection)");
      } else {
        console.log("3. [UNAVAILABLE] Build infrastructure (requires mechanic)");
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
        // Infrastructure Building
        await this.handleShelterAssignment(settler, hasMechanic);
      } else { 
        // Rest or default
        const restResult = settler.rest();
        console.log(restResult);
      }
    }

      await this.game.askQuestion("\nPress Enter to continue to Evening Summary...");
  }

    // Handle infrastructure building assignment
  async handleShelterAssignment(settler, hasMechanic) {
      // Check if the settler is a mechanic
      if (!hasMechanic || settler.role !== 'Mechanic') {
        if (!hasMechanic) {
          console.log("You need a mechanic to build or upgrade structures!");
        } else if (settler.role !== 'Mechanic') {
          console.log(`Only a mechanic can build structures, and ${settler.name} is a ${settler.role}!`);
        }
        console.log(`${settler.name} will rest instead.`);
        const restResult = settler.rest();
        console.log(restResult);
        return;
      }

      console.log("\nINFRASTRUCTURE BUILD OPTIONS:");

      const buildOptions = [];

      // Option 1: Shelter (if available)
      const upgradeInfo = this.game.settlement.canUpgradeShelter();
      
      if (upgradeInfo.possible) {
        const nextTier = this.game.settlement.shelterTier + 1;
        const nextName = this.game.settlement.shelterConfig[nextTier].name;
        const nextProtection = Math.round(this.game.settlement.shelterConfig[nextTier].protection * 100);
        const materialCost = upgradeInfo.materialsNeeded;
        const buildTime = upgradeInfo.timeNeeded;
        
        buildOptions.push({
          type: 'shelter',
          name: nextName,
          description: `Improve settlement shelter (${nextProtection}% protection)`,
          materialCost: materialCost,
          buildTime: buildTime
        });
        
        console.log(`1. Shelter: Upgrade to ${nextName}`);
        console.log(`   Materials: ${materialCost}, Build time: ${buildTime} days`);
        if (nextTier === 1) { // Basic Tents is tier 1
          console.log("   Benefit: Settlers will no longer lose health at night");
        } else {
          console.log("   Benefit: Improved shelter protection and hope bonus");
        }
      } else if (this.game.settlement.upgradeInProgress) {
        console.log("1. [UNAVAILABLE] Shelter upgrade already in progress");
        buildOptions.push(null);
      } else if (this.game.settlement.shelterTier >= this.game.settlement.shelterConfig.length - 1) {
        console.log("1. [UNAVAILABLE] Maximum shelter tier reached");
        buildOptions.push(null);
      } else {
        const nextTier = this.game.settlement.shelterTier + 1;
        const materialsNeeded = this.game.settlement.shelterConfig[nextTier].materialCost;
        console.log(`1. [UNAVAILABLE] Shelter upgrade (need ${materialsNeeded} materials, have ${this.game.settlement.resources.materials})`);
        buildOptions.push(null);
      }
      
      // Add infrastructure options
      const availableUpgrades = this.game.settlement.getAvailableUpgrades();
      let optionIndex = 2; // Start at 2 since shelter is option 1
      
      // Group by category for better display
      const foodUpgrades = availableUpgrades.filter(u => u.category === 'food');
      const waterUpgrades = availableUpgrades.filter(u => u.category === 'water');
      
      // Food infrastructure
      if (foodUpgrades.length > 0) {
        console.log("\nFood Production Infrastructure:");
        for (const upgrade of foodUpgrades) {
          buildOptions.push(upgrade);
          console.log(`${optionIndex}. Food: ${upgrade.name} (${upgrade.icon})`);
          console.log(`   ${upgrade.description}`);
          console.log(`   Materials: ${upgrade.materialCost}, Build time: ${upgrade.buildTime} days`);
          console.log(`   Production: ${upgrade.production.min}-${upgrade.production.max} food per day`);
          optionIndex++;
        }
      }
      
      // Water infrastructure
      if (waterUpgrades.length > 0) {
        console.log("\nWater Collection Infrastructure:");
        for (const upgrade of waterUpgrades) {
          buildOptions.push(upgrade);
          console.log(`${optionIndex}. Water: ${upgrade.name} (${upgrade.icon})`);
          console.log(`   ${upgrade.description}`);
          console.log(`   Materials: ${upgrade.materialCost}, Build time: ${upgrade.buildTime} days`);
          console.log(`   Production: ${upgrade.production.min}-${upgrade.production.max} water per day`);
          optionIndex++;
        }
      }
      
      // Add cancel option
      console.log(`\n${optionIndex}. Cancel (settler will rest instead)`);
      
      // Get player choice
      const buildChoice = await this.game.askQuestion(`\nChoose what to build (1-${optionIndex}): `);
      const choiceNum = parseInt(buildChoice);
      
      if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > optionIndex) {
        console.log("Invalid choice. Settler will rest instead.");
        const restResult = settler.rest();
        console.log(restResult);
        return;
      }
      
      // Handle cancel option
      if (choiceNum === optionIndex) {
        console.log(`${settler.name} will rest instead.`);
        const restResult = settler.rest();
        console.log(restResult);
        return;
      }
      
      // Get the selected option
      const selectedOption = buildOptions[choiceNum - 1];
      
      // Check if option is available
      if (!selectedOption) {
        console.log("That build option is not available.");
        console.log(`${settler.name} will rest instead.`);
        const restResult = settler.rest();
        console.log(restResult);
        return;
      }
      
      // Handle the selection
      if (selectedOption.type === 'shelter') {
        // Start shelter upgrade
        const upgradeResult = this.game.settlement.startShelterUpgrade(settler);
        
        if (upgradeResult.success) {
          console.log(upgradeResult.message);
          this.game.logEvent(`Started building ${selectedOption.name}. ${settler.name} will be busy for ${selectedOption.buildTime} days.`);
        } else {
          console.log(upgradeResult.message);
          console.log(`${settler.name} will rest instead.`);
          const restResult = settler.rest();
          console.log(restResult);
        }
      } else {
        // Handle other infrastructure building
        // First, find if there are other mechanics available to help
        const availableMechanics = [settler];
        
        // Check if there are other mechanics who could help
        const otherMechanics = this.game.settlers.filter(s => 
          s.role === 'Mechanic' && 
          !s.busy && 
          !s.recovering && 
          s.name !== settler.name
        );
        
        let additionalMechanics = [];
        
        if (otherMechanics.length > 0) {
          console.log(`\nThere ${otherMechanics.length === 1 ? 'is' : 'are'} ${otherMechanics.length} other available mechanic${otherMechanics.length === 1 ? '' : 's'}.`);
          console.log("Adding more mechanics will speed up construction.");
          
          for (const mechanic of otherMechanics) {
            const addMechanic = await this.game.askQuestion(`Add ${mechanic.name} to the project? (y/n): `);
            if (addMechanic.toLowerCase() === 'y') {
              additionalMechanics.push(mechanic);
            }
          }
        }
        
        // All mechanics who will work on the project
        const projectMechanics = [settler, ...additionalMechanics];
        
        // Start the infrastructure upgrade
        const upgradeResult = this.game.settlement.startInfrastructureUpgrade(
          selectedOption.type, 
          projectMechanics
        );
        
        if (upgradeResult.success) {
          console.log(upgradeResult.message);
          
          if (projectMechanics.length > 1) {
            const mechanicNames = projectMechanics.map(m => m.name).join(', ');
            const originalTime = selectedOption.buildTime;
            const adjustedTime = upgradeResult.adjustedBuildTime;
            
            console.log(`With ${projectMechanics.length} mechanics working together, construction time has been reduced from ${originalTime} to ${adjustedTime} days.`);
            this.game.logEvent(`Started building ${selectedOption.name}. ${mechanicNames} will be busy for ${adjustedTime} days.`);
          } else {
            this.game.logEvent(`Started building ${selectedOption.name}. ${settler.name} will be busy for ${selectedOption.buildTime} days.`);
          }
        } else {
          console.log(upgradeResult.message);
          console.log(`${settler.name} will rest instead.`);
          const restResult = settler.rest();
          console.log(restResult);
        }
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