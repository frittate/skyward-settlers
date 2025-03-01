// engine/phases/midday-phase.js
const { printPhaseHeader } = require('../../utils/utils');
const gameConfig = require('../../config/game-config');

class MiddayPhase {
  constructor(gameEngine) {
    this.game = gameEngine;
  }

  async execute() {
    printPhaseHeader("MIDDAY PHASE: RESOURCE DISTRIBUTION");

    // Get present (non-busy) settlers
    const presentSettlers = this.game.settlers.filter(settler => !settler.busy);
    const presentCount = presentSettlers.length;

    console.log(`You have ${this.game.settlement.resources.food} food and ${this.game.settlement.resources.water} water.`);
    console.log(`${presentCount} settlers are present and need resources.`);

    const autoDistribute = await this.game.askQuestion("\nDistribute resources automatically? (y/n): ");

    if (autoDistribute.toLowerCase() === 'y') {
      // Auto-distribute evenly
      await this.autoDistributeResources(presentSettlers);
    } else {
      // Manual distribution
      await this.manualDistributeResources(presentSettlers);
    }

    // Update health and morale based on consumption
    console.log("\nHEALTH & MORALE UPDATES:");
    presentSettlers.forEach(settler => {
      const changes = settler.updateWellbeing(this.game.settlement.hope);
      if (changes) {
        console.log(`- ${settler.name}: ${changes}`);
      } else {
        console.log(`- ${settler.name}'s health and morale remain stable.`);
      }
    });

    // Check for critical settler status
    this.game.checkCriticalStatus();

    // Display updated status
    this.game.displayStatus();

    return this.game.askQuestion("\nPress Enter to continue to Task Assignment...");
  }

  // Auto-distribute resources evenly
  async autoDistributeResources(presentSettlers) {
    const presentCount = presentSettlers.length;
    console.log("\nAUTOMATIC DISTRIBUTION:");

    let foodShortage = false;
    let waterShortage = false;

    // Distribute food
    if (this.game.settlement.resources.food >= presentCount) {
      this.game.settlement.removeResource('food', presentCount);
      console.log(`- Each settler received 1 food (${presentCount} total).`);
      presentSettlers.forEach(settler => {
        settler.daysWithoutFood = 0;
      });
    } else {
      console.log(`- Not enough food for everyone! Only ${this.game.settlement.resources.food}/${presentCount} settlers will eat.`);
      foodShortage = true;

      // Distribute available food (prioritize low health)
      let sortedSettlers = [...presentSettlers].sort((a, b) => a.health - b.health);
      for (let i = 0; i < sortedSettlers.length; i++) {
        if (i < this.game.settlement.resources.food) {
          sortedSettlers[i].daysWithoutFood = 0;
          console.log(`  - ${sortedSettlers[i].name} received food (Health: ${sortedSettlers[i].health}).`);
        } else {
          sortedSettlers[i].daysWithoutFood++;
          console.log(`  - ${sortedSettlers[i].name} went hungry (Health: ${sortedSettlers[i].health}).`);
        }
      }
      this.game.settlement.resources.food = 0;
    }

    // Distribute water
    if (this.game.settlement.resources.water >= presentCount) {
      this.game.settlement.removeResource('water', presentCount);
      console.log(`- Each settler received 1 water (${presentCount} total).`);
      presentSettlers.forEach(settler => {
        settler.daysWithoutWater = 0;
      });
    } else {
      console.log(`- Not enough water for everyone! Only ${this.game.settlement.resources.water}/${presentCount} settlers will drink.`);
      waterShortage = true;

      // Distribute available water (prioritize low morale)
      let sortedSettlers = [...presentSettlers].sort((a, b) => a.morale - b.morale);
      for (let i = 0; i < sortedSettlers.length; i++) {
        if (i < this.game.settlement.resources.water) {
          sortedSettlers[i].daysWithoutWater = 0;
          console.log(`  - ${sortedSettlers[i].name} received water (Morale: ${sortedSettlers[i].morale}).`);
        } else {
          sortedSettlers[i].daysWithoutWater++;
          console.log(`  - ${sortedSettlers[i].name} went thirsty (Morale: ${sortedSettlers[i].morale}).`);
        }
      }
      this.game.settlement.resources.water = 0;
    }

    // Apply hope penalties for resource shortages
    this.applyShortageEffects(foodShortage, waterShortage);
  }

  // Manually distribute resources to each settler
  async manualDistributeResources(presentSettlers) {
    console.log("\nMANUAL DISTRIBUTION:");

    let remainingFood = this.game.settlement.resources.food;
    let remainingWater = this.game.settlement.resources.water;
    let foodShortage = false;
    let waterShortage = false;

    // Distribute to each present settler
    for (const settler of presentSettlers) {
      console.log(`\n${settler.name} - Health: ${settler.health}, Morale: ${settler.morale}`);

      // Food distribution
      if (remainingFood > 0) {
        const giveFood = await this.game.askQuestion(`Give 1 food to ${settler.name}? (${remainingFood} remaining) (y/n): `);
        if (giveFood.toLowerCase() === 'y') {
          remainingFood--;
          settler.daysWithoutFood = 0;
          console.log(`- ${settler.name} received food.`);
        } else {
          settler.daysWithoutFood++;
          foodShortage = true;
          console.log(`- ${settler.name} went hungry.`);
        }
      } else {
        console.log("- No food remaining to distribute.");
        settler.daysWithoutFood++;
        foodShortage = true;
      }

      // Water distribution
      if (remainingWater > 0) {
        const giveWater = await this.game.askQuestion(`Give 1 water to ${settler.name}? (${remainingWater} remaining) (y/n): `);
        if (giveWater.toLowerCase() === 'y') {
          remainingWater--;
          settler.daysWithoutWater = 0;
          console.log(`- ${settler.name} received water.`);
        } else {
          settler.daysWithoutWater++;
          waterShortage = true;
          console.log(`- ${settler.name} went thirsty.`);
        }
      } else {
        console.log("- No water remaining to distribute.");
        settler.daysWithoutWater++;
        waterShortage = true;
      }
    }

    // Update remaining resources
    this.game.settlement.resources.food = remainingFood;
    this.game.settlement.resources.water = remainingWater;

    // Apply hope penalties for resource shortages
    this.applyShortageEffects(foodShortage, waterShortage);
  }
  
  // Apply hope penalties for resource shortages
  applyShortageEffects(foodShortage, waterShortage) {
    if (foodShortage) {
      const hopeMessage = this.game.settlement.updateHope(
        gameConfig.hope.hopeChange.foodShortage, 
        "food shortage"
      );
      if (hopeMessage) console.log(hopeMessage);
    }

    if (waterShortage) {
      const hopeMessage = this.game.settlement.updateHope(
        gameConfig.hope.hopeChange.waterShortage, 
        "water shortage"
      );
      if (hopeMessage) console.log(hopeMessage);
    }
  }
}

module.exports = MiddayPhase;