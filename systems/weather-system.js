// weather-system.js - Skyward Settlers
// Handles environmental events that affect the settlement

const { randomInt } = require('./utilities');

class WeatherSystem {
  constructor() {
    this.weatherTypes = [
      {
        name: 'rain',
        description: [
          'Light rain falls on the settlement rooftops.',  // Mild
          'Heavy rain pours down, creating puddles on the rooftop.',  // Moderate
          'A torrential downpour hammers the settlement without pause.'  // Severe
        ],
        chance: 0.35  // 35% chance of rain when weather occurs
      },
      {
        name: 'wind',
        description: [
          'Gusty winds blow through the settlement.',  // Mild
          'Strong winds whip around the building tops, making movement difficult.',  // Moderate
          'Powerful gales threaten to tear away anything not secured tightly.'  // Severe
        ],
        chance: 0.30  // 30% chance of wind
      },
      {
        name: 'heat',
        description: [
          'The day is unusually hot, the sun beating down mercilessly.',  // Mild
          'A heat wave has settled over the city, making the rooftops scorching.',  // Moderate
          'Extreme heat makes the rooftop feel like an oven, with no escape from the sun.'  // Severe
        ],
        chance: 0.20  // 20% chance of heat
      },
      {
        name: 'cold',
        description: [
          'The temperature drops, bringing a chill to the air.',  // Mild
          'Cold winds and low temperatures make everyone shiver.',  // Moderate
          'A bitter cold snap freezes water and numbs fingers and toes.'  // Severe
        ],
        chance: 0.15  // 15% chance of cold
      }
    ];
    
    // Weather state tracking
    this.currentWeather = null;
    this.weatherDuration = 0;
    this.weatherSeverity = 0; // 0-1 scale
  }
  
  // Check for weather events
  dailyWeatherCheck() {
    // First, decrement existing weather if it exists
    if (this.currentWeather) {
      this.weatherDuration--;
      
      // Check if current weather has ended
      if (this.weatherDuration <= 0) {
        const endingWeather = this.currentWeather;
        this.currentWeather = null;
        
        return {
          hasWeather: true,
          isNew: false,
          isEnding: true,
          type: endingWeather.name,
          name: this.getWeatherName(endingWeather.name, this.weatherSeverity),
          description: `The ${this.getWeatherName(endingWeather.name, this.weatherSeverity).toLowerCase()} has passed.`
        };
      }
      
      // Continuing weather
      return {
        hasWeather: true,
        isNew: false,
        isEnding: false,
        type: this.currentWeather.name,
        name: this.getWeatherName(this.currentWeather.name, this.weatherSeverity),
        severity: this.weatherSeverity,
        description: this.getWeatherDescription(this.currentWeather, this.weatherSeverity),
        daysLeft: this.weatherDuration
      };
    }
    
    // No current weather, check for new weather
    // Base chance of weather: 25-35% per day
    const baseWeatherChance = 0.25 + (Math.random() * 0.1);
    
    if (Math.random() < baseWeatherChance) {
      // Weather occurs! Determine which type
      const weatherRoll = Math.random();
      let cumulativeChance = 0;
      let selectedWeather = null;
      
      for (const weather of this.weatherTypes) {
        cumulativeChance += weather.chance;
        if (weatherRoll < cumulativeChance) {
          selectedWeather = weather;
          break;
        }
      }
      
      if (!selectedWeather) {
        selectedWeather = this.weatherTypes[0]; // Fallback to rain
      }
      
      // Determine severity (0.3-1.0)
      const severity = 0.3 + (Math.random() * 0.7);
      
      // Determine duration based on severity
      // More severe = potentially longer
      const baseDuration = 1;
      const extraDays = Math.floor(severity * 3);
      const duration = baseDuration + (Math.random() < 0.5 ? extraDays : 0);
      
      // Set current weather
      this.currentWeather = selectedWeather;
      this.weatherSeverity = severity;
      this.weatherDuration = duration;
      
      // Return weather info
      return {
        hasWeather: true,
        isNew: true,
        isEnding: false,
        type: selectedWeather.name,
        name: this.getWeatherName(selectedWeather.name, severity),
        severity: severity,
        description: this.getWeatherDescription(selectedWeather, severity),
        duration: duration
      };
    }
    
    // No weather today
    return {
      hasWeather: false
    };
  }
  
  // Get a descriptive name for the weather based on severity
  getWeatherName(type, severity) {
    let intensityPrefix = '';
    
    if (severity > 0.8) {
      intensityPrefix = 'Severe ';
    } else if (severity > 0.5) {
      intensityPrefix = 'Strong ';
    } else if (severity > 0.3) {
      intensityPrefix = 'Moderate ';
    } else {
      intensityPrefix = 'Light ';
    }
    
    switch (type) {
      case 'rain': return intensityPrefix + 'Rainstorm';
      case 'wind': return intensityPrefix + 'Winds';
      case 'heat': return intensityPrefix + 'Heat Wave';
      case 'cold': return intensityPrefix + 'Cold Snap';
      default: return intensityPrefix + 'Weather';
    }
  }
  
  // Get the appropriate description based on severity
  getWeatherDescription(weather, severity) {
    let descIndex = 0;
    
    if (severity > 0.8) {
      descIndex = 2; // Severe
    } else if (severity > 0.4) {
      descIndex = 1; // Moderate
    } else {
      descIndex = 0; // Mild
    }
    
    return weather.description[descIndex];
  }
  
  // Apply weather effects to expeditions
  applyExpeditionEffects(expedition) {
    // Only apply if we have active weather
    if (!this.currentWeather) return null;
    
    const effects = [];
    const weatherType = this.currentWeather.name;
    const severity = this.weatherSeverity;
    
    // Add impact based on expedition radius and weather severity
    let impact = severity;
    
    // Larger radius expeditions are more vulnerable to weather
    switch (expedition.radius) {
      case 'small': impact *= 0.7; break;
      case 'medium': impact *= 0.85; break;
      case 'large': impact *= 1.0; break;
    }
    
    // Very minor effects for low impact
    if (impact < 0.3) return null;
    
    // Apply effects based on weather type
    switch (weatherType) {
      case 'rain':
        if (impact > 0.4) {
          // Slow progress - increase expedition duration
          if (Math.random() < impact * 0.6) {
            expedition.duration += 1;
            effects.push({
              type: 'delay',
              message: `Heavy rain has slowed ${expedition.settler.name}'s progress.`
            });
          }
          
          // Health impact from exposure
          if (impact > 0.6 && Math.random() < impact * 0.4) {
            const healthLoss = Math.floor(impact * 15);
            expedition.settler.health = Math.max(0, expedition.settler.health - healthLoss);
            effects.push({
              type: 'health',
              amount: -healthLoss,
              message: `${expedition.settler.name} was caught in heavy rain and lost ${healthLoss} health.`
            });
          }
        }
        break;
        
      case 'wind':
        if (impact > 0.5) {
          // Stronger impact - danger and delays
          if (Math.random() < impact * 0.7) {
            // Resource loss from wind
            const resourcesToLose = Math.max(1, Math.floor(impact * 2));
            
            if (expedition.resources.food > resourcesToLose) {
              expedition.resources.food -= resourcesToLose;
              effects.push({
                type: 'resource',
                resource: 'food',
                amount: -resourcesToLose,
                message: `${expedition.settler.name}'s supplies were damaged by strong winds (-${resourcesToLose} food).`
              });
            } else if (expedition.resources.water > resourcesToLose) {
              expedition.resources.water -= resourcesToLose;
              effects.push({
                type: 'resource',
                resource: 'water',
                amount: -resourcesToLose,
                message: `${expedition.settler.name}'s water containers were damaged by strong winds (-${resourcesToLose} water).`
              });
            }
            
            // Health impact from debris
            const healthLoss = Math.floor(impact * 20);
            expedition.settler.health = Math.max(0, expedition.settler.health - healthLoss);
            effects.push({
              type: 'health',
              amount: -healthLoss,
              message: `${expedition.settler.name} was injured by debris in high winds (-${healthLoss} health).`
            });
          }
        }
        break;
        
      case 'heat':
        // Heat mainly affects water consumption and can cause dehydration
        if (impact > 0.4) {
          if (Math.random() < impact * 0.6) {
            // Extra water consumption
            if (expedition.resources.water > 0) {
              expedition.resources.water -= 1;
              effects.push({
                type: 'resource',
                resource: 'water',
                amount: -1,
                message: `${expedition.settler.name} consumed extra water due to extreme heat.`
              });
            } else {
              // Dehydration damage
              const healthLoss = Math.floor(impact * 25);
              expedition.settler.health = Math.max(0, expedition.settler.health - healthLoss);
              effects.push({
                type: 'health',
                amount: -healthLoss,
                message: `${expedition.settler.name} suffered from dehydration in the heat (-${healthLoss} health).`
              });
            }
          }
        }
        break;
        
      // Continuing the WeatherSystem class

      case 'cold':
        // Cold affects both health and morale
        if (impact > 0.4) {
          if (Math.random() < impact * 0.6) {
            // Health impact from cold
            const healthLoss = Math.floor(impact * 15);
            expedition.settler.health = Math.max(0, expedition.settler.health - healthLoss);
            
            // Morale impact from misery
            const moraleLoss = Math.floor(impact * 10);
            expedition.settler.morale = Math.max(0, expedition.settler.morale - moraleLoss);
            
            effects.push({
              type: 'health-morale',
              healthAmount: -healthLoss,
              moraleAmount: -moraleLoss,
              message: `${expedition.settler.name} struggled in the freezing conditions (-${healthLoss} health, -${moraleLoss} morale).`
            });
            
            // Extra food consumption to stay warm
            if (expedition.resources.food > 0) {
              expedition.resources.food -= 1;
              effects.push({
                type: 'resource',
                resource: 'food',
                amount: -1,
                message: `${expedition.settler.name} consumed extra food to stay warm.`
              });
            }
          }
        }
        break;
    }
    
    return effects.length > 0 ? effects : null;
  }
  
  // Get current weather status for display
  getWeatherStatus() {
    if (!this.currentWeather) {
      return {
        active: false,
        description: "The weather is clear and stable."
      };
    }
    
    return {
      active: true,
      type: this.currentWeather.name,
      name: this.getWeatherName(this.currentWeather.name, this.weatherSeverity),
      severity: this.weatherSeverity,
      description: this.getWeatherDescription(this.currentWeather, this.weatherSeverity),
      daysLeft: this.weatherDuration
    };
  }
}

module.exports = WeatherSystem;