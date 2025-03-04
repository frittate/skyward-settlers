
// game-engine.js - Skyward Settlers - Revised to use Settlement class
const Settler = require('./settler');
const Expedition = require('./expedition');
const EventSystem = require('./event-system');
const Settlement = require('./settlement');
const { printPhaseHeader, formatResourceList, randomInt } = require('./utilities');

// Main game class
class GameEngine {
  constructor(rl, askQuestion) {
    this.rl = rl;
    this.askQuestion = askQuestion;
    this.day = 1;
    
    // Create settlement
    this.settlement = new Settlement();
    
    this.settlers = [
      new Settler('Alex', 'Generalist', 100, 100),
      new Settler('Morgan', 'Generalist', 100, 100),
      new Settler('Sam', 'Mechanic', 40, 80, true) // Sam starts wounded
    ];
    this.expeditions = []; // Track ongoing expeditions
    this.eventSystem = new EventSystem();
    this.eventLog = []; // Store narrative events
  }
  
  // Add a message to the event log
  logEvent(message) {
    this.eventLog.push({
      day: this.day,
      message: message
    });
    console.log(message);
  }
  
  // Display current game state
  displayStatus() {
    console.log(`\n--- DAY ${this.day} STATUS ---`);
    console.log('\nSETTLERS:');
    this.settlers.forEach((settler, index) => {
      if (settler.busy) {
        // Don't show health/morale for settlers on expedition
        console.log(`${index + 1}. ${settler.name} (${settler.role}) - On expedition until day ${settler.busyUntil}`);
      } else {
        console.log(`${index + 1}. ${settler.toString()}`);
      }
    });

    console.log('\nRESOURCES:');
    console.log(`Food: ${this.settlement.resources.food}`);
    console.log(`Water: ${this.settlement.resources.water}`);
    console.log(`Meds: ${this.settlement.resources.meds}`);
    
    // Display Settlement Hope
    console.log(`\nSETTLEMENT HOPE: ${this.settlement.hope}`);
    this.displayHopeEffect();
  }
  
  // Display the effect of current hope level
  displayHopeEffect() {
    const hopeEffects = this.settlement.getHopeDescription();
    hopeEffects.forEach(effect => {
      console.log(`- ${effect}`);
    });
  }
  
  // Check for random visitor appearance based on hope
  async checkForVisitors() {
    const visitorChance = this.settlement.getVisitorChance();
    
    if (visitorChance > 0 && Math.random() * 100 < visitorChance) {
      await this.handleVisitor();
    }
  }
  
  // Generate and handle a random visitor for the settlement
  async handleVisitor() {
    // Generate visitor
    const visitor = this.settlement.generateVisitor();
    
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
    const acceptVisitor = await this.askQuestion("Do you want to accept this visitor into your settlement? (y/n): ");
    
    if (acceptVisitor.toLowerCase() === 'y') {
      // Add the visitor to the settlement
      const newSettler = new Settler(visitor.name, visitor.role, visitor.health, visitor.morale);
      this.settlers.push(newSettler);
      
      // Add their gift to resources
      for (const [resource, amount] of Object.entries(visitor.gift)) {
        if (amount > 0) {
          this.settlement.addResource(resource, amount);
        }
      }
      
      this.logEvent(`${visitor.name} (${visitor.role}) has joined the settlement!`);
      if (giftString) {
        this.logEvent(`${visitor.name} contributed ${giftString} to the community supplies.`);
      }
      
      // Special message for medic
      if (visitor.role === 'Medic') {
        this.logEvent("You now have a medic who can heal wounded settlers!");
      }
      
      // Hope boost for new settler
      const hopeMessage = this.settlement.updateHope(15, "new settler joined");
      if (hopeMessage) this.logEvent(hopeMessage);
    } else {
      this.logEvent(`You decided not to accept ${visitor.name} into the settlement.`);
      // Small hope penalty for turning someone away
      const hopeMessage = this.settlement.updateHope(-5, "turned away visitor");
      if (hopeMessage) this.logEvent(hopeMessage);
    }
  }
  
  async morningPhase() {
    printPhaseHeader("MORNING PHASE: RETURN & REPORT");
    console.log(`Day ${this.day} has begun.`);
    
    // Add daily hope for survival - REDUCED from 5 to 3
    if (this.day > 1) {
      const hopeMessage = this.settlement.updateHope(3, "another day survived");
      if (hopeMessage) console.log("\n" + hopeMessage);
    }
    
    // Check for random visitors based on hope
    await this.checkForVisitors();
    
    // Track consecutive days with sufficient resources
    const stabilityMessage = this.settlement.trackResourceStability(this.settlers);
    if (stabilityMessage) {
      console.log("\n" + stabilityMessage);
    }
    
    // Update recovery status for all settlers
    this.settlers.forEach(settler => {
      const recoveryMessage = settler.updateRecovery();
      if (recoveryMessage) {
        console.log(recoveryMessage);
      }
    });
    
    // 1. Check for expedition status reports
    const activeExpeditions = this.expeditions.filter(exp => 
      exp.statusReportDay === this.day && exp.statusReport
    );
    
    if (activeExpeditions.length > 0) {
      console.log("\nEXPEDITION STATUS REPORTS:");
      for (const expedition of activeExpeditions) {
        console.log(`- ${expedition.statusReport}`);
      }
    }
    
    // 2. Process returning expeditions
    const returnedExpeditions = this.expeditions.filter(exp => exp.returnDay === this.day);
    
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
            this.settlement.addResource(resource, amount);
          }
        }
        
        // Create resource report
        const resourceString = formatResourceList(expedition.resources);
        
        // Boost settler morale on successful return with resources
        if (Object.values(expedition.resources).some(val => val > 0)) {
          const moraleBoost = expedition.jackpotFind ? 25 : 15;
          settler.morale = Math.min(100, settler.morale + moraleBoost);
          let message = `- ${settler.name} has returned from the ${expedition.radius} radius with ${resourceString || "no resources"}. (+${moraleBoost} morale from successful expedition)`;
          if (expedition.jackpotFind) {
            message += " They found an exceptional cache of supplies!";
            const hopeMessage = this.settlement.updateHope(15, "exceptional resource find");
            if (hopeMessage) this.logEvent(hopeMessage);
          } else {
            const hopeMessage = this.settlement.updateHope(10, "successful expedition");
            if (hopeMessage) this.logEvent(hopeMessage);
          }
          message += ` They need ${expedition.recoverTime} days to recover.`;
          this.logEvent(message);
        } else {
          this.logEvent(`- ${settler.name} has returned from the ${expedition.radius} radius with no resources. The expedition was a failure. They need ${expedition.recoverTime} days to recover.`);
          const hopeMessage = this.settlement.updateHope(-5, "failed expedition");
          if (hopeMessage) this.logEvent(hopeMessage);
        }
        
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
      this.expeditions = this.expeditions.filter(exp => exp.returnDay !== this.day);
    } else {
      console.log("\nNo expeditions returning today.");
    }
    
    // Display settler status changes
    console.log("\nSETTLER STATUS:");
    this.settlers.forEach(settler => {
      if (settler.health < 50 && !settler.busy) {
        console.log(`- ${settler.name} is in poor health (${settler.health}/100).`);
      }
      if (settler.morale < 50 && !settler.busy) {
        console.log(`- ${settler.name} has low morale (${settler.morale}/100).`);
      }
    });
    
    // Display current status after returns
    this.displayStatus();
    
    await this.askQuestion("\nPress Enter to continue to Resource Distribution...");
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
    const acceptSurvivor = await this.askQuestion("Do you want to accept this survivor into your settlement? (y/n): ");
    
    if (acceptSurvivor.toLowerCase() === 'y') {
      // Add the survivor to the settlement
      const newSettler = new Settler(survivor.name, survivor.role, survivor.health, survivor.morale);
      this.settlers.push(newSettler);
      
      // Add their gift to resources
      for (const [resource, amount] of Object.entries(survivor.gift)) {
        if (amount > 0) {
          this.settlement.addResource(resource, amount);
        }
      }
      
      this.logEvent(`${survivor.name} (${survivor.role}) has joined the settlement!`);
      if (giftString) {
        this.logEvent(`${survivor.name} contributed ${giftString} to the community supplies.`);
      }
      
      // Special message for medic
      if (survivor.role === 'Medic') {
        this.logEvent("You now have a medic who can heal wounded settlers!");
      }
      
      // Hope boost for new survivor
      const hopeMessage = this.settlement.updateHope(20, "rescued survivor");
      if (hopeMessage) this.logEvent(hopeMessage);
    } else {
      this.logEvent(`You decided not to accept ${survivor.name} into the settlement.`);
      // Small hope penalty for turning someone away
      const hopeMessage = this.settlement.updateHope(-5, "turned away survivor");
      if (hopeMessage) this.logEvent(hopeMessage);
    }
return;
  }
  
  // PHASE 2: MIDDAY - Distribute resources to settlers
  async middayPhase() {
    printPhaseHeader("MIDDAY PHASE: RESOURCE DISTRIBUTION");
    
    // Get present (non-busy) settlers
    const presentSettlers = this.settlers.filter(settler => !settler.busy);
    const presentCount = presentSettlers.length;
    
    console.log(`You have ${this.settlement.resources.food} food and ${this.settlement.resources.water} water.`);
    console.log(`${presentCount} settlers are present and need resources.`);
    
    const autoDistribute = await this.askQuestion("\nDistribute resources automatically? (y/n): ");
    
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
      const changes = settler.updateWellbeing(this.settlement.hope);
      if (changes) {
        console.log(`- ${settler.name}: ${changes}`);
      } else {
        console.log(`- ${settler.name}'s health and morale remain stable.`);
      }
    });
    
    // Check for critical settler status
    this.checkCriticalStatus();
    
    // Display updated status
    this.displayStatus();
    
    await this.askQuestion("\nPress Enter to continue to Task Assignment...");
  }
  
  // Auto-distribute resources evenly
  async autoDistributeResources(presentSettlers) {
    const presentCount = presentSettlers.length;
    console.log("\nAUTOMATIC DISTRIBUTION:");
    
    let foodShortage = false;
    let waterShortage = false;
    
    // Distribute food
    if (this.settlement.resources.food >= presentCount) {
      this.settlement.removeResource('food', presentCount);
      console.log(`- Each settler received 1 food (${presentCount} total).`);
      presentSettlers.forEach(settler => {
        settler.daysWithoutFood = 0;
      });
    } else {
      console.log(`- Not enough food for everyone! Only ${this.settlement.resources.food}/${presentCount} settlers will eat.`);
      foodShortage = true;
      
      // Distribute available food (prioritize low health)
      let sortedSettlers = [...presentSettlers].sort((a, b) => a.health - b.health);
      for (let i = 0; i < sortedSettlers.length; i++) {
        if (i < this.settlement.resources.food) {
          sortedSettlers[i].daysWithoutFood = 0;
          console.log(`  - ${sortedSettlers[i].name} received food (Health: ${sortedSettlers[i].health}).`);
        } else {
          sortedSettlers[i].daysWithoutFood++;
          console.log(`  - ${sortedSettlers[i].name} went hungry (Health: ${sortedSettlers[i].health}).`);
        }
      }
      this.settlement.resources.food = 0;
    }
    
    // Distribute water
    if (this.settlement.resources.water >= presentCount) {
      this.settlement.removeResource('water', presentCount);
      console.log(`- Each settler received 1 water (${presentCount} total).`);
      presentSettlers.forEach(settler => {
        settler.daysWithoutWater = 0;
      });
    } else {
      console.log(`- Not enough water for everyone! Only ${this.settlement.resources.water}/${presentCount} settlers will drink.`);
      waterShortage = true;
      
      // Distribute available water (prioritize low morale)
      let sortedSettlers = [...presentSettlers].sort((a, b) => a.morale - b.morale);
      for (let i = 0; i < sortedSettlers.length; i++) {
        if (i < this.settlement.resources.water) {
          sortedSettlers[i].daysWithoutWater = 0;
          console.log(`  - ${sortedSettlers[i].name} received water (Morale: ${sortedSettlers[i].morale}).`);
        } else {
          sortedSettlers[i].daysWithoutWater++;
          console.log(`  - ${sortedSettlers[i].name} went thirsty (Morale: ${sortedSettlers[i].morale}).`);
        }
      }
      this.settlement.resources.water = 0;
    }
    
    // Apply hope penalties for resource shortages
    if (foodShortage) {
      const hopeMessage = this.settlement.updateHope(-3, "food shortage");
      if (hopeMessage) console.log(hopeMessage);
    }
    
    if (waterShortage) {
      const hopeMessage = this.settlement.updateHope(-3, "water shortage");
      if (hopeMessage) console.log(hopeMessage);
    }
  }
  
  // Manually distribute resources to each settler
  async manualDistributeResources(presentSettlers) {
    console.log("\nMANUAL DISTRIBUTION:");
    
    let remainingFood = this.settlement.resources.food;
    let remainingWater = this.settlement.resources.water;
    let foodShortage = false;
    let waterShortage = false;
    
    // Distribute to each present settler
    for (const settler of presentSettlers) {
      console.log(`\n${settler.name} - Health: ${settler.health}, Morale: ${settler.morale}`);
      
      // Food distribution
      if (remainingFood > 0) {
        const giveFood = await this.askQuestion(`Give 1 food to ${settler.name}? (${remainingFood} remaining) (y/n): `);
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
        const giveWater = await this.askQuestion(`Give 1 water to ${settler.name}? (${remainingWater} remaining) (y/n): `);
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
    this.settlement.resources.food = remainingFood;
    this.settlement.resources.water = remainingWater;
    
    // Apply hope penalties for resource shortages
    if (foodShortage) {
      const hopeMessage = this.settlement.updateHope(-3, "food shortage");
      if (hopeMessage) console.log(hopeMessage);
    }
    
    if (waterShortage) {
      const hopeMessage = this.settlement.updateHope(-3, "water shortage");
      if (hopeMessage) console.log(hopeMessage);
    }
  }
  
  // Check for critical settler status (death, abandonment)
  checkCriticalStatus() {
    for (let i = this.settlers.length - 1; i >= 0; i--) {
      const settler = this.settlers[i];
      
      // Check health
      if (settler.health <= 0) {
        this.logEvent(`\n! ${settler.name} has died due to poor health!`);
        this.settlers.splice(i, 1);
        // Major hope loss when settler dies
        const hopeMessage = this.settlement.updateHope(-20, "settler death");
        if (hopeMessage) this.logEvent(hopeMessage);
        continue;
      }
      
      // Check morale
      if (settler.morale <= 0) {
        this.logEvent(`\n! ${settler.name} has left the settlement due to low morale!`);
        this.settlers.splice(i, 1);
        // Major hope loss when settler leaves
        const hopeMessage = this.settlement.updateHope(-15, "settler abandonment");
        if (hopeMessage) this.logEvent(hopeMessage);
        continue;
      }
    }
  }
  
  // PHASE 3: AFTERNOON - Assign tasks to settlers
  // Continuation of afternoonPhase
  async afternoonPhase() {
    printPhaseHeader("AFTERNOON PHASE: TASK ASSIGNMENT");
    
    // Get available (non-busy and non-recovering) settlers
    const availableSettlers = this.settlers.filter(settler => !settler.busy && !settler.recovering);
    
    if (availableSettlers.length === 0) {
      console.log("No settlers available for tasks today.");
      await this.askQuestion("\nPress Enter to continue to Evening Summary...");
      return;
    }
    
    console.log("Available settlers:");
    availableSettlers.forEach((settler, index) => {
      console.log(`${index + 1}. ${settler.name} (${settler.role}) - Health: ${settler.health}, Morale: ${settler.morale}`);
    });
    
    // Calculate how many settlers we can send on expeditions
    // At least one settler must remain at the settlement
    const availableForExpedition = Math.max(0, this.settlers.length - 1 - this.settlers.filter(s => s.busy || s.recovering).length);
    if (availableForExpedition <= 0) {
      console.log("\nWARNING: You must keep at least one settler at the settlement!");
    }
    
    // Count of settlers assigned to expeditions this turn
    let expeditionCount = 0;
    
    // Assign tasks to each available settler
    for (let i = 0; i < availableSettlers.length; i++) {
      const settlerIndex = this.settlers.findIndex(s => s.name === availableSettlers[i].name);
      const settler = this.settlers[settlerIndex];
      
      console.log(`\nAssign task to ${settler.name}:`);
      
      // Only show foraging option if we haven't reached the limit
      if (expeditionCount < availableForExpedition) {
        // Check if emergency foraging is needed
        if (this.settlement.resources.food === 0 && this.settlement.resources.water === 0) {
          console.log("1. Emergency foraging (desperate measure, no supplies needed)");
        } else {
          console.log("1. Send foraging");
        }
      } else {
        console.log("1. [UNAVAILABLE] Send foraging (must keep at least one settler at settlement)");
      }
      
      // Only show healing option if there's a medic
      const hasMedic = this.settlers.some(s => s.role === 'Medic');
      if (hasMedic && settler.role === 'Medic') {
        console.log("2. Heal (requires medicine and a medic)");
      } else {
        console.log("2. [UNAVAILABLE] Heal (requires medicine and a medic)");
      }
      
      console.log("3. Rest");
      
      const taskChoice = await this.askQuestion("Choose task (1-3): ");
      
      if (taskChoice === '1') { // Foraging
        if (expeditionCount >= availableForExpedition) {
          console.log("You must keep at least one settler at the settlement!");
          console.log(`${settler.name} will rest instead.`);
          const restResult = settler.rest();
          console.log(restResult);
        } else if (settler.health > 20) {
          // Check if this is an emergency foraging situation
          const isEmergency = this.settlement.resources.food === 0 && this.settlement.resources.water === 0;
          
          if (isEmergency) {
            // Emergency foraging is always a 1-day small radius expedition with no supply cost
            console.log("\nEMERGENCY FORAGING:");
            console.log("- 1 day expedition");
            console.log("- No supplies needed");
            console.log("- High risk of failure (70%)");
            console.log("- Low resource return if successful");
            
            const confirmEmergency = await this.askQuestion("Proceed with emergency foraging? (y/n): ");
            
            if (confirmEmergency.toLowerCase() === 'y') {
              // Create emergency expedition
              const expedition = new Expedition(settler, 'emergency');
              const returnDay = this.day + 1; // Always 1 day
              expedition.returnDay = returnDay;
              
              // Process expedition events and resources
              expedition.processExpedition(this.eventSystem);
              
              // Mark settler as busy
              settler.busy = true;
              settler.busyUntil = returnDay;
              
              // Add to active expeditions
              this.expeditions.push(expedition);
              
              expeditionCount++;
              
              this.logEvent(`${settler.name} set out on an emergency foraging mission. They should return tomorrow.`);
            } else {
              console.log(`${settler.name} will rest instead.`);
              const restResult = settler.rest();
              console.log(restResult);
            }
          } else {
            // Normal expedition process
            console.log("\nChoose expedition radius:");
            console.log("1. Small (2-3 days, costs 1 food & 1 water)");
            console.log("2. Medium (3-5 days, costs 2 food & 2 water)");
            console.log("3. Large (5-7 days, costs 3 food & 3 water)");
            
            const radiusChoice = await this.askQuestion("Select radius (1-3): ");
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
            if (this.settlement.resources.food >= expedition.supplyCost.food && 
                this.settlement.resources.water >= expedition.supplyCost.water) {
                
              // Deduct the supplies
              this.settlement.removeResource('food', expedition.supplyCost.food);
              this.settlement.removeResource('water', expedition.supplyCost.water);
              
              const returnDay = this.day + expedition.duration;
              expedition.returnDay = returnDay;
              
              // Process expedition events and resources
              expedition.processExpedition(this.eventSystem);
              
              // Mark settler as busy
              settler.busy = true;
              settler.busyUntil = returnDay;
              
              // Add to active expeditions
              this.expeditions.push(expedition);
              
              expeditionCount++;
              
              // Don't reveal return day to increase tension
              this.logEvent(`${settler.name} set out on a ${radius} radius expedition with ${expedition.supplyCost.food} food and ${expedition.supplyCost.water} water.`);
            } else {
              console.log(`Not enough supplies! This expedition requires ${expedition.supplyCost.food} food and ${expedition.supplyCost.water} water.`);
              console.log(`${settler.name} will rest instead.`);
              const restResult = settler.rest();
              console.log(restResult);
            }
          }
        } else {
          console.log(`${settler.name} is too unhealthy to forage.`);
          console.log(`${settler.name} will rest instead.`);
          const restResult = settler.rest();
          console.log(restResult);
        }
      } else if (taskChoice === '2') { // Healing
        if (hasMedic && settler.role === 'Medic' && this.settlement.resources.meds > 0) {
          console.log("Who do you want to heal?");
          this.settlers.forEach((s, idx) => {
            console.log(`${idx + 1}. ${s.name} - Health: ${s.health}${s.wounded ? ' [WOUNDED]' : ''}`);
          });
          const targetChoice = await this.askQuestion("Choose settler to heal (1-" + this.settlers.length + "): ");
          const targetIndex = parseInt(targetChoice, 10) - 1;
          
          if (targetIndex >= 0 && targetIndex < this.settlers.length) {
            await this.healSettler(targetIndex);
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
      } else { // Rest or default
        const restResult = settler.rest();
        console.log(restResult);
      }
    }
    
    await this.askQuestion("\nPress Enter to continue to Evening Summary...");
  }
  
  // Heal a settler using medicine
  async healSettler(targetIndex) {
    const target = this.settlers[targetIndex];
    
    // Find a medic
    const medic = this.settlers.find(s => s.role === 'Medic' && !s.busy);
    
    if (medic && this.settlement.resources.meds > 0) {
      this.settlement.removeResource('meds', 1);
      const previousHealth = target.health;
      target.health = Math.min(100, target.health + 30);
      
      // Cure wounded status if present
      let healMessage = `${medic.name} used 1 medicine to heal ${target.name}. Health improved from ${previousHealth} to ${target.health}.`;
      if (target.wounded) {
        target.wounded = false;
        healMessage += ` ${target.name} is no longer wounded.`;
      }
      
      this.logEvent(healMessage);
      return true;
    } 
    
    if (!medic) {
      console.log("A medic is required to heal settlers!");
    } else {
      console.log("Not enough medicine!");
    }
    return false;
  }
  
  // PHASE 4: EVENING - Summarize day and advance
  async eveningPhase() {
    printPhaseHeader("EVENING PHASE: DAY SUMMARY");
    
    console.log(`Day ${this.day} is complete.`);
    
    // Summarize the day's events
    console.log("\nSETTLEMENT STATUS:");
    console.log(`- Settlers: ${this.settlers.length}`);
    console.log(`- Food remaining: ${this.settlement.resources.food}`);
    console.log(`- Water remaining: ${this.settlement.resources.water}`);
    console.log(`- Medicine remaining: ${this.settlement.resources.meds}`);
    console.log(`- Active expeditions: ${this.expeditions.length}`);
    
    // Preview tomorrow's events
    console.log("\nTOMORROW'S PREVIEW:");
    
    // DON'T show who returns tomorrow - just that someone might
    const returningSettlerCount = this.expeditions.filter(exp => exp.returnDay === this.day + 1).length;
    if (returningSettlerCount > 0) {
      console.log(`- ${returningSettlerCount} expedition${returningSettlerCount > 1 ? 's' : ''} may return tomorrow.`);
    } else {
      console.log("- No expeditions expected to return tomorrow.");
    }
    
    // Resource needs preview
    const presentTomorrow = this.settlers.length - this.expeditions.filter(exp => exp.returnDay > this.day + 1).length;
    console.log(`- ${presentTomorrow} settlers will need food and water tomorrow.`);
    
    // Resource warning
    if (this.settlement.resources.food < presentTomorrow) {
      console.log(`! WARNING: Not enough food for everyone tomorrow (${this.settlement.resources.food}/${presentTomorrow}).`);
    }
    if (this.settlement.resources.water < presentTomorrow) {
      console.log(`! WARNING: Not enough water for everyone tomorrow (${this.settlement.resources.water}/${presentTomorrow}).`);
    }
    
    // Advance day
    this.day++;
    
    const continueGame = await this.askQuestion("\nAdvance to next day? (y/n): ");
    return continueGame.toLowerCase() === 'y';
  }
  
  // Run a full day cycle
  async runDayCycle() {
    // Phase 1: Morning - Returns and reports
    await this.morningPhase();
    
    // Check if all settlers at home have died but some are on expedition
    const homeSettlers = this.settlers.filter(s => !s.busy);
    const expeditionSettlers = this.settlers.filter(s => s.busy);
    
    if (homeSettlers.length === 0 && expeditionSettlers.length > 0) {
      console.log("\n! CRITICAL SITUATION: All settlers at the settlement have died or left!");
      console.log(`There are still ${expeditionSettlers.length} settlers on expedition who may return.`);
    }
    
    // Phase 2: Midday - Resource distribution
    await this.middayPhase();
    
    // Phase 3: Afternoon - Task assignment
    await this.afternoonPhase();
    
    // Phase 4: Evening - Day summary
    const continueGame = await this.eveningPhase();
    
    // Check for game over - only if ALL settlers are gone
    if (this.settlers.length === 0) {
      console.log("\n*** GAME OVER ***");
      console.log("All settlers have died or left the settlement.");
      return false;
    }
    
    return continueGame;
  }
  
  // Main game loop
  async start() {
    console.log("=== SKYWARD SETTLERS ===");
    console.log("A post-apocalyptic rooftop settlement simulation");
    console.log("Core Loop Prototype\n");
    
    this.displayStatus();
    await this.askQuestion("\nPress Enter to begin Day 1...");
    
    // Main game loop
    let continueGame = true;
    while (continueGame) {
      continueGame = await this.runDayCycle();
    }
    
    console.log("\nThanks for playing Skyward Settlers!");
    this.rl.close();
  }
}

module.exports = GameEngine;