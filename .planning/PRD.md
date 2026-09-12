# Family World

Enter the world your family remembers.

**Status:** Hackathon Prototype
**Version:** 0.1
**Core technology:** Generative world model / Visko Orbis
**Primary demo:** Three curated family worlds + create-your-own family memory

---

## 1. Product Vision

Family World transforms family photographs, memories, places, and dates into explorable generative worlds.

Traditional genealogy products answer:

> "Who were my grandparents?"

Family World asks:

> "What was it like to be them?"

Instead of stopping at a family tree, users can select a family member at a particular moment in their life and enter a reconstructed version of that person's world.

The experience combines:

- family photographs
- oral memories
- dates and locations
- historical context
- generative imagery
- continuously generated world-model experiences

The goal is not to claim a perfect reconstruction of the past.

The goal is to turn fragmented family history into an emotionally meaningful place that later generations can explore.

---

## 2. Core Product Proposition

Your family tree isn't just a chart. It's a world.

A user provides four fundamental pieces of information:

**Person + Place + Year + Memory**

For example:

> Lola
> Cavite City, Philippines
> 1956
> "She remembers walking with her mother to the market."

Family World generates an environment inspired by that memory.

The user can then:

**ENTER HER WORLD**

---

## 3. Hackathon Goal

Build a convincing prototype demonstrating that family memories can become interactive generative environments.

The hackathon prototype does not need to solve genealogy.

It needs to prove one interaction:

**Select a relative → select a memory → enter their world.**

Success means someone seeing the demo understands the concept within approximately 30 seconds and wants to try it with their own family.

---

## 4. Demo Experience

The application opens with three example families representing dramatically different places and periods.

### World A — Philippines

**Lola**
Cavite City, Philippines
1956
Approximately age 9

Example memory:

> "She remembers going to the market with her family."

Possible environments:

- family home
- barrio street
- neighborhood market

This is the flagship example and can use the existing Cavite Family World assets.

### World B — Cambodia

**Yay**
Phnom Penh, Cambodia
1963
Approximately age 10

Example memory:

> "She remembers walking to the market with her older sister."

Possible environments:

- family neighborhood
- market
- school route

The emphasis should be ordinary childhood and family life rather than later political violence.

### World C — Soviet Union

**Babushka**
Leningrad, USSR
1984
Approximately age 16

Example memory:

> "She remembers taking the tram across the city after school."

Possible environments:

- apartment
- tram journey
- neighborhood shop
- school neighborhood

---

## 5. Primary User Flow

```
FAMILY WORLD
      │
      ▼
Choose a Family
      │
      ▼
Family Tree
      │
      ▼
Choose a Person
      │
      ▼
Life Timeline
      │
      ▼
Choose a Memory
      │
      ▼
ENTER THEIR WORLD
      │
      ▼
Generative World
      │
      ├── Explore Home
      ├── Visit Market
      └── Explore Neighborhood
```

The family tree is therefore not the destination.

It is the map into the worlds.

---

## 6. Landing Experience

Suggested hero:

**FAMILY WORLD**
Meet the people who came before you.

Three family cards appear:

```
┌─────────────────────┐
│ LOLA                │
│ Cavite • 1956       │
│ Age 9               │
│                     │
│ ENTER HER WORLD →   │
└─────────────────────┘
┌─────────────────────┐
│ YAY                 │
│ Phnom Penh • 1963   │
│ Age 10              │
│                     │
│ ENTER HER WORLD →   │
└─────────────────────┘
┌─────────────────────┐
│ BABUSHKA            │
│ Leningrad • 1984    │
│ Age 16              │
│                     │
│ ENTER HER WORLD →   │
└─────────────────────┘
```

Below these:

**Create Your Family World**

`[ + Add Someone ]`

---

## 7. Create-Your-Own Flow

The hackathon prototype should deliberately minimize required input.

### Step 1 — Person

Fields:

- Name / family nickname
- Relationship
- Approximate age in memory
- Photograph upload

Example: Grandma / My grandmother / Age 11

### Step 2 — Place

Fields:

- City
- Country
- Approximate year

Example: Warsaw / Poland / 1952

### Step 3 — Memory

Prompt:

> What do you remember being told about this time?

Free text.

Example:

> "Grandma said her mother sent her out every morning to buy bread."

### Step 4 — Generate

Display:

> Creating Grandma's World…

The application converts the structured information into a world-model prompt.

---

## 8. World Prompt Generation

Input:

```yaml
person:
  relationship: grandmother
  age: 11
location:
  city: Warsaw
  country: Poland
year: 1952
memory:
  "Her mother sent her out every morning to buy bread."
```

The prompt-generation layer produces something conceptually similar to:

> Reconstruct a plausible memory of Warsaw, Poland, in 1952.
> The central character is an approximately 11-year-old girl.
> She lives with her family in this neighborhood.
> Her mother regularly sends her outside in the morning to purchase bread.
> Begin outside the family's home.
> Show historically plausible architecture, clothing, transportation, shops, street conditions, weather, and everyday behavior.
> Maintain the same child and environment between scenes.
> The experience should resemble an imperfect remembered childhood rather than a polished historical film.

If a photograph is supplied, use it as the initial visual anchor where supported.

---

## 9. Enter World

After generation:

> **Grandma's World**
> Warsaw · 1952 · Age 11
>
> `[ ENTER WORLD ]`

The world-model stream begins.

---

## 10. World Interaction

Do NOT attempt unrestricted world navigation during the hackathon.

Provide three context-aware actions.

Example:

```
Grandma's World
Warsaw • 1952
[ Go to her home ]
[ Walk to the bakery ]
[ Explore the neighborhood ]
```

Selecting an action sends a new continuation prompt to the world model.

Example — "Walk to the bakery":

> Continue the same uninterrupted memory.
> Follow the same girl as she leaves home and walks toward the neighborhood bakery.
> Maintain the same architecture, weather, clothing, time of day and visual identity.
> Show ordinary street life appropriate to Warsaw in approximately 1952.

The important technical demonstration is: **the world continues instead of restarting.**

---

## 11. Memory Provenance

Family World must not imply that generated content is historical fact.

Information should eventually support three provenance levels:

**Remembered** — Directly supplied by the family.
Example: "Grandma said she bought bread every morning."

**Documented** — Supported by photographs, documents, maps, historical records, or other sources.
Example: Photograph labeled Warsaw, 1952.

**Reconstructed** — Generated because the original information does not exist.
Example: The appearance of the bakery is an AI reconstruction based on the place and period.

For the hackathon, a small indicator is sufficient:

> AI reconstruction based on family memories and historical context.

---

## 12. Technical Architecture

```
                 FAMILY WORLD
                       │
                       ▼
                React / Web UI
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
    Family Data                Media Assets
 person/place/year            family photos
 memories/relations
          │                         │
          └────────────┬────────────┘
                        ▼
                MEMORY DIRECTOR
                        │
                        ▼
                       LLM
                        │
             structured world prompt
                        │
                        ▼
                VISKO / ORBIS
                        │
                world generation
                        │
                        ▼
               A/V WORLD STREAM
                        │
                        ▼
                    Browser
                        │
                        ▼
             User chooses action
                        │
                        └──────────►
                          new prompt
```

---

## 13. Memory Director

Create a lightweight abstraction between the application and world model.

Responsibilities:

1. Receive person data.
2. Receive memory.
3. Receive location/year.
4. Generate initial world prompt.
5. Maintain current scene state.
6. Translate user actions into continuation prompts.
7. Preserve important character/environment constraints.

Suggested interface:

```
createWorld(person, memory)
enterWorld(world)
transitionWorld(world, action)
```

Avoid building a complicated autonomous agent architecture.

For the hackathon, this is essentially structured prompt orchestration.

---

## 14. Data Model

Minimal prototype:

```
Family
 ├── id
 ├── name
 └── people[]

Person
 ├── id
 ├── name
 ├── relationship
 ├── photo
 └── memories[]

Memory
 ├── id
 ├── year
 ├── location
 ├── age
 ├── description
 ├── provenance
 └── worldConfig
```

This is enough to support the demo.

---

## 15. Three Prepared Worlds

The demo must NOT depend entirely on live arbitrary generation.

Prepare three high-quality examples:

- **Cavite — 1956** — Flagship world. Most polished.
- **Phnom Penh — 1963** — Second demonstration of cultural/geographic generalization.
- **Leningrad — 1984** — Demonstrates a dramatically different period, climate and built environment.

The prepared examples protect the demo from model latency, API failure, or unpredictable generation.

---

## 16. Live Demo Mode

After showing a prepared world:

**Create Your Own**

Ask someone for:

- relationship
- photograph
- city
- year
- one memory

Generate their world.

This is the technical climax of the demonstration.

If successful: Family World clearly generalizes beyond the prepared examples.

---

## 17. Demo Script

**0–15 seconds**

> "Family trees tell us who our grandparents were. But they don't tell us what it felt like to be them."

Show family tree.

**15–30 seconds**

Select: Lola — Cavite City — 1956

> "This is my father's family in 1950s Cavite."

Open memory.

**30–45 seconds**

Click: ENTER THEIR WORLD

World model begins.

**45–60 seconds**

> "These worlds are reconstructed from family memories, photographs, places and dates."

Select: Visit the market

World transitions.

**60–75 seconds**

Return to application. Show Cambodia and Leningrad examples.

> "And the system isn't specific to my family."

**75–100 seconds**

Open: Create Your Family World

Enter another person's: Person + Place + Year + Memory

Generate.

**Closing**

> "Every family has a world that disappeared. Family World lets the next generation enter it."

---

## 18. Hackathon MVP

**Must work:**

- Landing page
- Three example family members
- Simple family-tree visualization
- Person profile
- Memory selection
- Enter World
- Orbis/world-model integration
- At least one convincing continuous world
- Three world actions
- Create-your-own form
- Prompt generation

**Should work:**

- Photo upload
- Three polished example worlds
- Live arbitrary world generation
- Smooth transitions
- Loading/error states

**Do not build:**

- Full genealogy database
- GEDCOM import
- Ancestry integration
- DNA analysis
- Genetics
- HealthKit
- medical interpretation
- authentication complexity
- social network
- collaborative editing
- sophisticated historical RAG
- native mobile apps
- unrestricted 3D navigation
- complicated multi-agent architecture

> **Hard scope boundary for this hackathon:** Section 18 is the hard scope boundary. Do not let HealthKit, genetics, elaborate agents, or full genealogy creep into the build until Enter World → choose action → world continues is working.

---

## 19. Stretch Goals

Only begin these after the primary experience works.

**Voice Memories** — Grandma records: "Every Saturday my mother took us to the market…" Family World extracts Person + Place + Time + Event and generates a memory automatically.

**Ask Grandma's World** — User asks: "Where did Grandma go to school?" Family evidence is searched before historical reconstruction occurs.

**Historical Context** — Family memory: Manila, 1945. Family World retrieves contextual information about Manila during that period.

**Multiple Memories** — One person's life becomes a navigable timeline:

```
GRANDMA
1947
Childhood
   │
1959
University
   │
1968
Marriage
   │
1972
Migration
```

Each node becomes an enterable world.

---

## 20. Post-Hackathon Possibilities

The underlying primitive is broader than genealogy:

**Person + Place + Time + Memory → World**

This eventually allows: grandparents, parents, childhood memories, migration stories, family homes, lost neighborhoods, oral histories, diaspora histories, personal memoirs.

Potential later integrations include: genealogy services, historical archives, maps, scanned documents, family video, voice recordings, 3D reconstruction, genetic genealogy, HealthKit / activity experiences.

These should remain outside the initial product until the central Family World experience is validated.

---

## 21. Product Principle

Family World should never claim:

> "This is what happened."

Instead:

> "This is a world reconstructed from what your family remembers."

The uncertainty is part of the experience.

---

## 22. North-Star Hackathon Moment

The most important moment in the entire prototype is:

```
       GRANDMA
           │
     Warsaw • 1952
           │
           ▼
   [ ENTER HER WORLD ]
           ↓
   The photograph becomes
       somewhere you can go.
```

If that moment works, the hackathon prototype works.

Everything else is secondary.

---

## 23. One-Line Pitch

Family World turns family memories into worlds the next generation can enter.

**Alternative:** Give us a person, a place, a year and a memory. We'll give you a world you can enter.

**Emotional tagline:** Every family has a world that disappeared. Enter yours.
