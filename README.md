# Skyward Settlers

A post-apocalyptic rooftop settlement survival simulation game.

## Game Overview

In Skyward Settlers, you manage a small group of survivors who have found refuge on the rooftops of skyscrapers after a catastrophic flood has made the world below dangerous and uninhabitable. Your goal is to build a sustainable settlement, manage limited resources, and ensure your settlers' survival in this harsh new reality.

## Core Gameplay Loop

1. **Morning Phase: Return & Report** - Expeditions return, status reports arrive, and settlers recover from previous day's activities.
2. **Midday Phase: Resource Distribution** - Distribute food and water to your settlers.
3. **Afternoon Phase: Task Assignment** - Assign tasks to your available settlers (foraging, healing, resting).
4. **Evening Phase: Day Summary** - Review the day's events and prepare for tomorrow.

## Key Features

### Settlement Management
- Manage critical resources (food, water, medicine)
- Distribute resources strategically among your settlers
- Monitor settler health, morale, and special conditions
- Track "Settlement Hope" which affects morale penalties and visitor chances

### Expedition System
- Send settlers on foraging expeditions in different radii (small, medium, large)
- Each radius has different duration, resource costs, and reward potentials
- Emergency foraging available when resources are critically low
- Random events while on expedition (both positive and negative)
- Possibility to find new survivors to join your settlement

### Settler System
- Each settler has health, morale, and special skills
- Settlers can become wounded and require medicine to heal
- If health reaches zero, settlers die
- If morale reaches zero, settlers abandon the settlement
- Settlers need recovery time after expeditions

### Dynamic Events
- Random events occur during expeditions
- Visitors may be attracted to your settlement based on your hope level
- Resource shortages affect settler health and morale
- Resource stability provides morale boosts

## Settler Roles

- **Generalist**: Basic settler with no special abilities
- **Mechanic**: Can build structures (future feature)
- **Medic**: Can heal wounded settlers using medicine

## Getting Started

### Prerequisites
- Node.js installed on your system

### Installation
1. Clone this repository
2. Navigate to the project directory
3. Run the game with: `node skyward-main.js`

## Game Commands

During gameplay, you'll be prompted to make decisions through text input:
- Resource distribution (automatic or manual)
- Task assignment for each settler
- Expedition planning (radius selection)
- Accept/reject new survivors

## Tips for Survival

- Keep at least one settler at home at all times
- Balance risk vs. reward when sending expeditions
- Prioritize finding medicine to heal wounded settlers
- Maintain sufficient hope to attract new settlers
- Consider the special skills of potential new settlers
- Manage your resources carefully - starvation and dehydration can be deadly

## Technical Details

The game is built with:
- JavaScript/Node.js
- Command-line interface using readline

## Project Structure

- `skyward-main.js` - Main entry point of the game
- `game-engine.js` - Core game loop and phase management
- `settler.js` - Settler class with attributes and behaviors
- `expedition.js` - Expedition logic and resource generation
- `event-system.js` - Random event generation and effects
- `utilities.js` - Helper functions and formatting

## Future Development Plans

- Building mechanics using the Mechanic role
- More diverse events and encounters
- Weather system affecting rooftop life
- Relationships between settlers
- Expanded resource types and crafting
- Visual interface upgrade

## Author

[Your Name]

## License

[Your License Choice]

---

*"The world below is flooded and dangerous. Your small group of survivors has found refuge on the rooftop of a tall building. You must scavenge for resources, manage your settlers' needs, and build a sustainable settlement among the skyscrapers."*