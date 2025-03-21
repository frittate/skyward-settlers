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

    this.game.displaySettlerStatus()

    const availableSettlers = this.game.getSettlersAvailableForTasks();
    let settlersAtHome;
    for (const settler of availableSettlers) {
      settlersAtHome = this.game.getSettlersAtHome();
  
      console.log(`\nAssign task to ${settler.name} (${settler.role}):`);
        
      // Only allow expedition if at least one settler would remain
      if (settlersAtHome.length - 1 === 0) {
        console.log("1. [UNAVAILABLE] Send foraging (must keep at least one settler at settlement)");
      } else {
        console.log("1. Send foraging");
      }

      // Only show healing option if there is medicine
      const hasMedicine = this.game.settlement.resources.meds > 0;
      if (hasMedicine) {
        console.log("2. Heal");
      } else {
        console.log("2. [UNAVAILABLE] Heal (requires medicine)");
      }

      // Show build infrastructure option if there's a mechanic
      if (settler.role === 'Mechanic') {
        console.log("3. Build infrastructure (shelter, food production, water collection)");
      }

      console.log("4. Rest");

      // Check if emergency foraging is needed
      const resourcesAreLow = (this.game.settlement.resources.food + this.game.settlement.resources.water) < 4
      if (resourcesAreLow) {
        console.log("5. High risk emergency foraging (desperate measure, no supplies needed)");
      }

      const taskChoice = await this.game.askQuestion("Choose task: ");

      if (taskChoice === '1') {
        if (settlersAtHome.length - 1 === 0) {
          console.log("Cannot send foraging, must keep at least one settler at settlement.");
          continue;
        }
        await this.handleForagingAssignment(settler);
      } else if (taskChoice === '2') { 
        await this.handleHealingAssignment(settler);
      } else if (taskChoice === '3') { 
        await this.handleInfrastructureAssignment(settler);
      } else if (taskChoice === '5') {
        await this.handleForagingAssignment(settler, true);
      } else { 
        const restResult = settler.rest();
        console.log(restResult)
      }
    };

    await this.game.askQuestion("\nPress Enter to continue to Evening Summary...");
  }

    // Handle infrastructure building assignment
    async handleInfrastructureAssignment(settler) {    
      console.log("\nINFRASTRUCTURE BUILD OPTIONS:");
    
      const buildOptions = [];
      
      // Get all available upgrades from settlement
      const availableUpgrades = this.game.settlement.infrastructure.getAvailableUpgrades();
      let optionIndex = 1;
    
      // Check if any upgrades are available
      if (availableUpgrades.length === 0) {
        console.log("No upgrades available. All infrastructure is at maximum level or upgrades are already in progress.");
        console.log(`${settler.name} will rest instead.`);
        const restResult = settler.rest();
        console.log(restResult);
        return;
      }
    
      // Group by category for better display
      const shelterUpgrades = availableUpgrades.filter(u => u.category === 'shelter');
      const foodUpgrades = availableUpgrades.filter(u => u.category === 'food');
      const waterUpgrades = availableUpgrades.filter(u => u.category === 'water');
      
      // Shelter infrastructure
      if (shelterUpgrades.length > 0) {
        console.log("\nShelter Upgrades:");
        for (const upgrade of shelterUpgrades) {
          // Check if we have enough materials
          const canAfford = this.game.settlement.resources.materials >= upgrade.materialCost;
          
          // Check if upgrade is already in progress
          const inProgress = this.game.settlement.infrastructure.hasUpgradeInProgress('shelter');
          
          if (canAfford && !inProgress) {
            buildOptions.push({
              category: 'shelter',
              name: upgrade.name,
              description: upgrade.description,
              materialCost: upgrade.materialCost,
              buildTime: upgrade.buildTime,
              level: upgrade.level,
              protection: upgrade.protection
            });
            
            const protectionPercent = Math.round(upgrade.protection * 100);
            console.log(`${optionIndex}. Shelter: Upgrade to ${upgrade.name}`);
            console.log(`   ${upgrade.description}`);
            console.log(`   Materials: ${upgrade.materialCost}, Build time: ${upgrade.buildTime} days`);
            console.log(`   Protection: ${protectionPercent}%`);
            
            // Special message for first upgrade
            if (upgrade.level === 1) {
              console.log("   Benefit: Settlers will no longer lose health at night");
            }
            
            optionIndex++;
          } else if (inProgress) {
            console.log(`[UNAVAILABLE] Shelter upgrade already in progress`);
          } else {
            console.log(`[UNAVAILABLE] Shelter upgrade to ${upgrade.name} (need ${upgrade.materialCost} materials, have ${this.game.settlement.resources.materials})`);
          }
        }
      } else {
        console.log("No shelter upgrades available.");
      }
      
      // Food infrastructure
      if (foodUpgrades.length > 0) {
        console.log("\nFood Production Infrastructure:");
        for (const upgrade of foodUpgrades) {
          // Check if we have enough materials
          const canAfford = this.game.settlement.resources.materials >= upgrade.materialCost;
          
          // Check if upgrade is already in progress
          const inProgress = this.game.settlement.infrastructure.hasUpgradeInProgress('food');
          
          if (canAfford && !inProgress) {
            buildOptions.push({
              category: 'food',
              name: upgrade.name,
              description: upgrade.description,
              materialCost: upgrade.materialCost,
              buildTime: upgrade.buildTime,
              level: upgrade.level,
              production: upgrade.production
            });
            
            console.log(`${optionIndex}. Food: ${upgrade.name}`);
            console.log(`   ${upgrade.description}`);
            console.log(`   Materials: ${upgrade.materialCost}, Build time: ${upgrade.buildTime} days`);
            console.log(`   Production: ${upgrade.production.min}-${upgrade.production.max} food per day`);
            optionIndex++;
          } else if (inProgress) {
            console.log(`[UNAVAILABLE] Food production upgrade already in progress`);
          } else {
            console.log(`[UNAVAILABLE] Food upgrade to ${upgrade.name} (need ${upgrade.materialCost} materials, have ${this.game.settlement.resources.materials})`);
          }
        }
      } else {
        console.log("No food production upgrades available.");
      }
      
      // Water infrastructure
      if (waterUpgrades.length > 0) {
        console.log("\nWater Collection Infrastructure:");
        for (const upgrade of waterUpgrades) {
          // Check if we have enough materials
          const canAfford = this.game.settlement.resources.materials >= upgrade.materialCost;
          
          // Check if upgrade is already in progress
          const inProgress = this.game.settlement.infrastructure.hasUpgradeInProgress('water');
          
          if (canAfford && !inProgress) {
            buildOptions.push({
              category: 'water',
              name: upgrade.name,
              description: upgrade.description,
              materialCost: upgrade.materialCost,
              buildTime: upgrade.buildTime,
              level: upgrade.level,
              production: upgrade.production
            });
            
            console.log(`${optionIndex}. Water: ${upgrade.name}`);
            console.log(`   ${upgrade.description}`);
            console.log(`   Materials: ${upgrade.materialCost}, Build time: ${upgrade.buildTime} days`);
            console.log(`   Production: ${upgrade.production.min}-${upgrade.production.max} water per day`);
            optionIndex++;
          } else if (inProgress) {
            console.log(`[UNAVAILABLE] Water collection upgrade already in progress`);
          } else {
            console.log(`[UNAVAILABLE] Water upgrade to ${upgrade.name} (need ${upgrade.materialCost} materials, have ${this.game.settlement.resources.materials})`);
          }
        }
      } else {
        console.log("No water collection upgrades available.");
      }
      
      // If no affordable upgrades are available
      if (buildOptions.length === 0) {
        console.log("\nNo affordable upgrades available. Make sure you have enough materials.");
        console.log(`${settler.name} will rest instead.`);
        const restResult = settler.rest();
        console.log(restResult);
        return;
      }
      
      // Add cancel option
      console.log(`\n${optionIndex}. Cancel (settler will rest instead)`);
      
      // Get player choice
      const buildChoice = await this.game.askQuestion(`\nChoose what to build or upgrade (1-${optionIndex}): `);
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
      
      // Check if we still have enough materials (might have changed if async)
      if (this.game.settlement.resources.materials < selectedOption.materialCost) {
        console.log(`Not enough materials! This upgrade requires ${selectedOption.materialCost} materials.`);
        console.log(`${settler.name} will rest instead.`);
        const restResult = settler.rest();
        console.log(restResult);
        return;
      }
      
      // Use materials
      this.game.settlement.resources.materials -= selectedOption.materialCost;
      
      // Start the infrastructure upgrade
      const upgradeResult = this.game.settlement.infrastructure.startUpgrade(
        selectedOption.category, 
        projectMechanics,
        this.game.day
      );
      
      if (upgradeResult.success) {      
        if (projectMechanics.length > 1) {
          const mechanicNames = projectMechanics.map(m => m.name).join(', ');
          const originalTime = selectedOption.buildTime;
          const adjustedTime = upgradeResult.adjustedBuildTime;
          
          console.log(`With ${projectMechanics.length} mechanics working together, construction time has been reduced from ${originalTime} to ${adjustedTime} days.`);
          this.game.logEvent(`Started upgrade to ${selectedOption.name}. ${mechanicNames} will be busy for ${adjustedTime} days.`);
        } else {
          this.game.logEvent(`Started upgrade to ${selectedOption.name}. ${settler.name} will be busy for ${selectedOption.buildTime} days.`);
        }
      } else {
        // Refund materials if upgrade failed
        this.game.settlement.resources.materials += selectedOption.materialCost;
        
        console.log(upgradeResult.message);
        console.log(`${settler.name} will rest instead.`);
        const restResult = settler.rest();
        console.log(restResult);
      }
    }
    
  // Handle foraging expedition assignment
  async handleForagingAssignment(settler, isEmergency = false) {
    if (settler.health <= 20) {
      console.log(`${settler.name} is too unhealthy to forage.`);
      console.log(`${settler.name} will rest instead.`);
      const restResult = settler.rest();
      console.log(restResult);
      return;
    }

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
      settler.activity = 'expedition';
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
      settler.activity = 'expedition';
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
    const hasMeds = this.game.settlement.resources.meds > 0;
    const isMedic = settler.role === 'Medic';

    if (!hasMeds) {
      console.log('No meds available.');
      return;
    }
  
    const settlersAtHome = this.game.getSettlersAtHome()
    console.log("Who do you want to heal?");
    settlersAtHome.forEach((s, idx) => {
      console.log(`${idx + 1}. ${s.name} - Health: ${s.health}${s.wounded ? ' [WOUNDED]' : ''}`);
    });
    
    const targetChoice = await this.game.askQuestion("Choose settler to heal: ");
    const targetIndex = parseInt(targetChoice, 10) - 1;
    const targetSettler = settlersAtHome[targetIndex];

    if (targetIndex >= 0 && targetIndex < settlersAtHome.length) {
      await this.healSettler(targetSettler, isMedic);
    } else {
      console.log("Invalid choice, settler will rest instead.");
      const restResult = settler.rest();
      console.log(restResult);
    }
  }

  // Heal a settler using medicine
  async healSettler(target, isMedic = false) {
    if (this.game.settlement.resources.meds > 0) {
      this.game.settlement.removeResource('meds', 1);
      
      // Apply healing
      const healResult = target.heal(1, isMedic);
      
      let healMessage = `Used 1 medicine to heal ${target.name}. Health improved from ${target.health - healResult.healthGained} to ${target.health}.`;
      
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