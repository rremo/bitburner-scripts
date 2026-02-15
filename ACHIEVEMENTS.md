# 🏆 Bitburner Steam Achievement Guide

## Overview

Bitburner has **98 Steam Achievements** across 20+ categories. This guide shows how to use the automation scripts to unlock them efficiently.

---

## 📊 Achievement Categories

### **Automatic (Scripts handle these)**

These achievements are earned automatically by running the standard automation suite:

| Achievement | Script | How to Earn |
|-------------|--------|-------------|
| **CyberSec → Illuminati** (7 factions) | `faction-manager.js` | Auto-joins factions as you progress |
| **SF1.1 → SF12.1** (Source Files) | `autopilot.js` | Auto-destroys BitNodes |
| **1 Quintillion** | `daemon.js` + `stockmaster.js` | Passive income accumulation |
| **Install 1 Aug** | `faction-manager.js --purchase` | Auto-purchases augmentations |
| **4S Market Data** | `stockmaster.js` | Auto-purchases when affordable ($25B) |
| **TOR Router** | `tor-manager.js` | Auto-purchases ($200k) |
| **Join Gang** | `gangs.js` | Auto-forms gang when karma < -54000 |
| **Join Bladeburner** | `bladeburner.js` | Auto-joins when available |
| **Hacknet Income** | `hacknet-upgrade-manager.js` | Passive hashnet farming |

### **Configuration Required**

These need specific command-line arguments:

#### **🧬 Install 100 Augmentations**
```bash
run faction-manager.js --purchase
```
Keep buying augmentations across multiple resets until you have 100 installed.

#### **📋 Queue 40 Augmentations**
```bash
run faction-manager.js --purchase
```
The script will queue up to 40 augs in one session when you have enough money.

#### **🎯 Neuroflux Level 255**
```bash
run faction-manager.js --purchase
```
The script prioritizes Neuroflux Governor. Keep buying it across many resets.

#### **💪 3000 All Combat Stats**
```bash
run sleeve.js --train-to-strength 3000 --train-to-defense 3000 --train-to-dexterity 3000 --train-to-agility 3000 --training-cap-seconds 999999999
```
This will take VERY long (weeks of in-game time). Recommended for BN2 (gangs give combat multipliers).

#### **🧠 100k Hacking**
Run daemon and training scripts normally. This happens naturally with good augmentations.

#### **🤖 Intelligence 255**
```bash
run farm-intelligence.js
```
Only available in BitNode 5. Farm intelligence through Bladeburner or crime.

#### **🏃 Speed Run (< 48 hours)**
```bash
run autopilot.js --fast-mode
```
Focus on minimum viable path to destroy BitNode quickly.

### **Manual Required**

These cannot be fully automated:

#### **🏢 Corporation Achievements (5)**
No corporation script exists. Manual play required:
- Create corporation
- Unlock lobbying
- Reach 1000x production multiplier
- Hire 3000 employees
- Expand to Real Estate division

#### **🎮 Challenge Achievements (11)**
Requires playing with handicaps:
- **BN1 Challenge**: Max 128GB RAM + 1 core
- **BN2 Challenge**: No gang formation
- **BN3 Challenge**: No corporation
- **BN6/7 Challenge**: No Bladeburner
- **BN8 Challenge**: No 4S data
- **BN9 Challenge**: No hacknet servers
- **BN10 Challenge**: No sleeves
- **BN12 Challenge**: Destroy 50 times (SF12 level 50)
- **BN13 Challenge**: No Stanek's Gift

To attempt these, manually avoid using the restricted features.

#### **💀 -1 Million Karma**
```bash
run sleeve.js --crime Homicide
```
Or manually commit crimes. Takes ~1000 successful homicides.

#### **🐛 Exploit Achievements (10 secret)**
These require finding easter eggs and game exploits:
- Bypass RAM costs
- Tamper with prototypes
- Click unclickable elements
- Call undocumented functions
- Edit save files
- Access dev menu
- etc.

Refer to community guides for specifics (intentionally not automated).

---

## 🎯 Recommended Achievement Path

### **Phase 1: Easy Wins (First Session)**
```bash
# Start core automation
run autopilot.js

# These will auto-unlock:
# ✓ CyberSec (first faction)
# ✓ BruteSSH.exe (first program)
# ✓ TOR Router
# ✓ Travel (autopilot travels)
# ✓ Workout (sleeves train)
```

### **Phase 2: Progression (First BitNode)**
```bash
# Continue autopilot through BN1
run autopilot.js

# Achievements earned:
# ✓ All hacking programs (BruteSSH → SQLInject)
# ✓ First augmentation install
# ✓ Source File 1.1
# ✓ NiteSec, Black Hand, BitRunners (factions)
# ✓ Formulas.exe
```

### **Phase 3: Long-Term Grinding**
```bash
# Buy augmentations aggressively
run faction-manager.js --purchase

# Target achievements:
# ✓ 100 augmentations installed (10-20 resets)
# ✓ Neuroflux level 255 (50+ resets)
# ✓ Queue 40 augmentations (one big purchase)
# ✓ Join Daedalus, Covenant, Illuminati
```

### **Phase 4: Source Files**
```bash
# Destroy all 12 BitNodes
run autopilot.js

# Recommended order (easiest first):
# BN1 → BN2 → BN4 → BN5 → BN8 → BN10 → BN3 → BN6 → BN7 → BN9 → BN11 → BN12
```

### **Phase 5: Advanced Challenges**
Manually attempt challenge modes for each BitNode.

### **Phase 6: Secrets & Exploits**
Search for easter eggs and hidden mechanics (community help recommended).

---

## 📈 Progress Tracking

Run the achievement tracker to see your progress:

```bash
run achievement-tracker.js
```

This shows:
- Overall completion percentage
- Progress by category
- Next achievable targets
- Optimization tips

---

## 🎮 Script Command Reference

### **For Maximum Achievements:**

```bash
# Core automation (handles 50+ achievements automatically)
run autopilot.js

# Aggressive augmentation purchasing (3 achievements)
run faction-manager.js --purchase

# Combat training for achievement (very long)
run sleeve.js --train-to-strength 3000 --train-to-defense 3000 --train-to-dexterity 3000 --train-to-agility 3000

# Intelligence farming (BN5 only)
run farm-intelligence.js

# Track your progress
run achievement-tracker.js
```

### **Challenge Mode Helpers:**

```bash
# BN1 Challenge (128GB RAM limit)
# Don't upgrade home RAM beyond 128GB

# BN2 Challenge (no gang)
run autopilot.js --disable-gangs

# BN8 Challenge (no 4S)
run stockmaster.js --disable-4s-purchases

# BN9 Challenge (no hacknet servers)
run autopilot.js --disable-hacknet-servers

# BN10 Challenge (no sleeves)
# Don't run sleeve.js
```

---

## 💡 Achievement Tips

### **Money Achievements**
- **1 Quintillion**: Let daemon.js and stockmaster.js run for weeks
- **Massive Debt**: Get this early by taking out loans and not repaying

### **Faction Achievements**
- **Illuminati**: Requires 30 augmentations + high stats
- **Daedalus**: Requires 100k hacking OR 100 augmentations
- **The Covenant**: Requires 20 augmentations + high stats

### **Time-Gated Achievements**
- **Neuroflux 255**: Expect 50-100 BitNode resets
- **100 Augmentations**: Expect 10-20 resets
- **Combat 3000**: Multiple weeks of continuous sleeve training

### **Skill Achievements**
- **100k Hacking**: Natural progression with augmentations
- **3000 Combat**: Use BN2 (gang) or BN7 (bladeburner) multipliers
- **255 Intelligence**: BN5 only, farm through Bladeburner contracts

### **Gang Achievements**
- **100% Territory**: Use gangs.js and be patient (slow mechanic)
- **Gang Member 10k**: Train one member aggressively in one stat

### **Speed Run Tips**
- Focus on minimum viable path: BruteSSH → NiteSec → faction → augs → next BN
- Skip optional content (corporation, bladeburner, sleeves)
- Use script automation from the start
- Target BN1 or BN8 for easiest speed runs

---

## 🏆 Current Achievement Count: 98/98

**Easily Automatable:** ~50 achievements
**Requires Configuration:** ~20 achievements
**Manual/Challenge Required:** ~15 achievements
**Secret/Exploit Required:** ~13 achievements

Good luck hunting! 🎮
