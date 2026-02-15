# Bitburner Steam Achievement Guide

## Overview

Bitburner has **98 Steam Achievements** across 15+ categories. The automation scripts now actively target most of them. Run `achievement-tracker.js` to see your real-time progress.

---

## Achievement Categories & Automation Status

### Fully Automated (~55 achievements)

These unlock automatically by running `autopilot.js`:

| Category | Count | Achievements |
|----------|-------|-------------|
| Factions | 7 | CyberSec, NiteSec, Black Hand, BitRunners, Daedalus, Covenant, Illuminati |
| Programs | 6 | BruteSSH, FTPCrack, relaySMTP, HTTPWorm, SQLInject, Formulas.exe |
| Source Files | 12 | SF1.1 through SF12.1 |
| Money | 1 | Earn $1 Quintillion |
| Augmentations | 4 | Install 1, Install 100, Queue 40, Neuroflux 255 |
| Skills | 1 | Hacking >= 100k |
| Hacknet | 4 | First node, 30 nodes, $10M income, $1B server income |
| Gang | 3 | Form gang, Full gang, 100% Territory |
| Bladeburner | 2 | Join division, Max Overclock |
| Lifestyle | 4 | Travel, TOR, Workout, 30 Scripts on home |
| Stock | 1 | Purchase 4S Data |
| Rep | 2 | 10M rep, Unlock donations |
| Server | 3 | Drain server, Max RAM, Max Cores |
| Scripts | 1 | NS2 script (always true) |
| Misc | 1 | Backdoor powerhouse-fitness |

### Newly Automated (~20 achievements)

These are now automated with the latest script changes:

| Achievement | Script | How It Works |
|-------------|--------|-------------|
| **Karma -1M** | `sleeve.js` | Sleeve 0 grinds homicide until karma <= -1M |
| **Gang Member 10k** | `gangs.js` | Strongest member protected from ascending until 10k stat |
| **BB 100k Unspent SP** | `bladeburner.js` | Stops spending skill points after Overclock max, saves to 100k |
| **Script >= 32GB** | `achievement-32gb-script.js` | Just having this file on home triggers the achievement |
| **Stock $1Q Profit** | `stockmaster.js` | Long-term trading accumulates to $1Q |
| **1000 Running Scripts** | `achieve-1000-scripts.js` | Spawns minimal scripts across network (needs ~1.6TB RAM) |
| **Max Hacknet Node** | `hacknet-upgrade-manager.js` | `--max-one-for-achievement` maxes one node completely |
| **Max Hacknet Server** | `hacknet-upgrade-manager.js` | Same flag, works for both nodes and servers |
| **Fill Hash Capacity** | `spend-hacknet-hashes.js` | `--fill-capacity-once` waits for hashes to fill, then resumes |
| **Speed Run < 48h** | `autopilot.js` | `--speed-run` optimizes for fast BN completion |
| **Create Corporation** | `corporation.js` | Auto-creates and manages a corporation |
| **Unlock Lobbying** | `corporation.js` | Purchases Government Partnership when affordable |
| **Production x1000** | `corporation.js` | Grows division production multiplier to 1000+ |
| **3000 Employees** | `corporation.js` | Scales offices and hires across all cities |
| **Real Estate Division** | `corporation.js` | Creates a Real Estate division automatically |

### Requires Configuration (~8 achievements)

| Achievement | Command | Notes |
|-------------|---------|-------|
| **Combat 3000** | `run sleeve.js --train-to-strength 3000 ...` | Very long, best in BN2 |
| **Intelligence 255** | `run farm-intelligence.js` | BN5 only |
| **All Hacknet Servers** | `run hacknet-upgrade-manager.js -c --max-payoff-time 999h` | Buy all 20 servers |
| **Speed Run < 48h** | `run autopilot.js --speed-run` | Best in BN1/BN8 with high SFs |
| **BN Challenges** (9) | `run autopilot.js --challenge-mode` | Auto-restricts features per BN |

### BN Challenge Mode Details

`--challenge-mode` auto-detects the current BN and disables the restricted feature:

| BN | Restriction | What Gets Disabled |
|----|------------|-------------------|
| BN1 | 128GB + 1 Core | Warning shown (don't buy home upgrades) |
| BN2 | No Gang | gangs.js killed, gang formation blocked |
| BN3 | No Corporation | corporation.js should not be run |
| BN6 | No Bladeburner | bladeburner.js disabled via daemon |
| BN7 | No Bladeburner | bladeburner.js disabled via daemon |
| BN8 | No 4S Data | stockmaster --buy-4s-budget 0 |
| BN9 | No Hacknet Income | spend-hacknet-hashes suppressed |
| BN10 | No Sleeves | sleeve.js killed and blocked |
| BN13 | No Stanek | Stanek's Gift acceptance blocked |

### Manual Required (~5 achievements)

| Achievement | Condition | Notes |
|-------------|-----------|-------|
| **-$1B Debt** | Player.money <= -1e9 | Overspend on augs before reset |
| **Hospitalized** | Go to hospital once | Fail a dangerous crime manually |
| **1h in BitVerse** | Stay on BitVerse screen | AFK for 1+ hours |
| **All 8 Sleeves** | SF10.3 + buy sleeves | Manual sleeve purchase |
| **BN12 Level 50** | Destroy BN12 fifty times | Extreme grind |

### Secret/Exploit (12 achievements)

Cannot be automated - require game exploits or save editing:
- BYPASS, PROTOTYPETAMPERING, UNCLICKABLE, UNDOCUMENTEDFUNCTIONCALL
- TIMECOMPRESSION, REALITYALTERATION, N00DLES, EDITSAVEFILE
- DEVMENU, RAINBOW, TRUE_RECURSION, UNACHIEVABLE

Refer to community guides (e.g. Reddit, Discord) for specifics.

---

## Progress Tracking

```bash
run achievement-tracker.js
```

Shows real-time progress for all 98 achievements:
- Overall completion percentage
- Per-category progress bars
- Persistent storage remembers one-time achievements across resets
- `[?]` marks achievements that can't be verified via API
- Corporation achievements now auto-detected via API

Options:
```bash
run achievement-tracker.js --show-all            # Show all 98 achievements
run achievement-tracker.js --interval 30000      # Update every 30 seconds
run achievement-tracker.js --mark-earned TRAVEL   # Manually mark an unverifiable achievement
```

---

## Quick Start for Maximum Achievements

```bash
# 1. Core automation (unlocks 50+ achievements over time)
run autopilot.js

# 2. Track progress
run achievement-tracker.js

# 3. The 32GB script achievement (instant - just have the file)
# achievement-32gb-script.js is already on home

# 4. Automatic achievements (no config needed):
# - Karma grinding: sleeve 0 does homicide until -1M
# - Bladeburner SP: saves 100k after Overclock max
# - Gang member power: strongest member protected until 10k stat

# 5. Hacknet achievements (run once when ready):
run hacknet-upgrade-manager.js -c --max-one-for-achievement  # Max one node/server
run spend-hacknet-hashes.js --fill-capacity-once              # Fill hash capacity

# 6. 1000 scripts (needs ~1.6TB+ network RAM):
run achieve-1000-scripts.js

# 7. Speed run (use in BN1 or BN8 with high SFs):
run autopilot.js --speed-run

# 8. Corporation (needs $150B or BN3):
run corporation.js

# 9. BN Challenges (run in each target BN):
run autopilot.js --challenge-mode
```

## Recommended Achievement Path

### Phase 1: First Session
- `run autopilot.js` - Unlocks CyberSec, BruteSSH, TOR, Travel, Workout
- achievement-32gb-script.js triggers SCRIPT_32GB immediately

### Phase 2: First BitNode
- All 6 programs, first augmentation, SF1.1
- NiteSec, Black Hand, BitRunners factions

### Phase 3: Multi-BitNode Grinding
- Source Files SF1-SF12 (12 achievements)
- 100 augmentations installed (10-20 resets)
- Neuroflux 255 (50+ resets)
- Karma -1M (automatic via sleeve grinding)
- Gang member 10k stat (automatic via ascend protection)
- Bladeburner 100k SP (automatic after Overclock max)

### Phase 4: Hacknet & Scripts
- `run hacknet-upgrade-manager.js -c --max-one-for-achievement` - Max node/server
- `run spend-hacknet-hashes.js --fill-capacity-once` - Fill hash capacity
- `run achieve-1000-scripts.js` - 1000 running scripts

### Phase 5: Corporation
- `run corporation.js` - Automates all 5 corporation achievements
- Needs $150B to self-fund (or play in BN3 for free creation)
- Achievements: Create Corp, Real Estate, 3000 Employees, Prod x1000, Lobbying

### Phase 6: Long-Term Goals
- Hacking 100k, Combat 3000, Intelligence 255
- $1 Quintillion, Stock $1Q profit
- Speed run in < 48 hours (`--speed-run` flag)

### Phase 7: BN Challenges
- `run autopilot.js --challenge-mode` in each target BN
- BN1 (128GB+1Core), BN2 (No Gang), BN3 (No Corp)
- BN6/7 (No BB), BN8 (No 4S), BN9 (No Hacknet$)
- BN10 (No Sleeves), BN13 (No Stanek)

### Phase 8: Manual & Exploits
- Hospitalized, -$1B Debt, 1h in BitVerse, All 8 Sleeves
- BN12 Level 50 (extreme grind)
- Exploits (12 achievements) - community guides

---

## Script Changes for Achievements

| Script | Change | Achievement |
|--------|--------|-------------|
| `sleeve.js` | Sleeve 0 grinds homicide until -1M karma | KARMA_1000000 |
| `bladeburner.js` | Stops spending SP after Overclock max until 100k saved | BLADEBURNER_UNSPENT_100000 |
| `gangs.js` | Strongest member skipped during ascension until 10k stat | GANG_MEMBER_POWER |
| `daemon.js` | Skips servers with <95% hack chance | Better efficiency |
| `achievement-tracker.js` | Tracks all 98 achievements with API detection + persistence | All tracking |
| `achievement-32gb-script.js` | New file with >32GB RAM cost | SCRIPT_32GB |
| `achieve-1000-scripts.js` | New file spawning 1000 scripts across network | RUNNING_SCRIPTS_1000 |
| `hacknet-upgrade-manager.js` | `--max-one-for-achievement` maxes one node/server | MAX_HACKNET_NODE/SERVER |
| `spend-hacknet-hashes.js` | `--fill-capacity-once` fills hash capacity | MAX_CACHE |
| `autopilot.js` | `--speed-run` for <48h BN, `--challenge-mode` for BN challenges | FAST_BN, CHALLENGE_BN* |
| `corporation.js` | New file automating full corporation management | 5 CORPORATION_* achievements |

---

## Achievement Totals: 98

| Status | Count |
|--------|-------|
| Fully automated | ~55 |
| Newly automated | ~20 |
| Needs config | ~8 |
| Manual required | ~5 |
| Secret/exploit | ~12 |
