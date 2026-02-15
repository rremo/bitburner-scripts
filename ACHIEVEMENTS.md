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

### Newly Automated (~10 achievements)

These are now automated with the latest script changes:

| Achievement | Script | How It Works |
|-------------|--------|-------------|
| **Karma -1M** | `sleeve.js` | Sleeve 0 now grinds homicide until karma <= -1M |
| **Gang Member 10k** | `gangs.js` | Strongest member protected from ascending until 10k stat |
| **BB 100k Unspent SP** | `bladeburner.js` | Stops spending skill points after Overclock max, saves to 100k |
| **Script >= 32GB** | `achievement-32gb-script.js` | Just having this file on home triggers the achievement |
| **Stock $1Q Profit** | `stockmaster.js` | Long-term trading accumulates to $1Q |

### Requires Configuration (~8 achievements)

| Achievement | Command | Notes |
|-------------|---------|-------|
| **Combat 3000** | `run sleeve.js --train-to-strength 3000 --train-to-defense 3000 --train-to-dexterity 3000 --train-to-agility 3000 --training-cap-seconds 999999999` | Very long, best in BN2 |
| **Intelligence 255** | `run farm-intelligence.js` | BN5 only |
| **1000 Running Scripts** | `run achieve-1000-scripts.js` | Needs ~2TB+ network RAM |
| **Max Hacknet Node** | `run hacknet-upgrade-manager.js --max-one-for-achievement` | One node fully maxed |
| **Max Hacknet Server** | Same as above | One server fully maxed |
| **Fill Hash Capacity** | Pause `spend-hacknet-hashes.js` briefly | Let hashes fill once |
| **All Hacknet Servers** | `run hacknet-upgrade-manager.js` with generous payoff | Buy all 20 servers |
| **Speed Run < 48h** | Rush w0r1d_d43m0n in BN1 with high SFs | Target BN1 or BN8 |

### Manual Required (~13 achievements)

| Achievement | Condition | Notes |
|-------------|-----------|-------|
| **-$1B Debt** | Player.money <= -1e9 | Hard to trigger via API |
| **Hospitalized** | Go to hospital once | Fail a dangerous crime manually |
| **1h in BitVerse** | Stay on BitVerse screen | AFK for 1+ hours |
| **All 8 Sleeves** | SF10.3 + buy sleeves | Manual sleeve purchase |
| **Corporation** (5) | Create corp, lobbying, 1000 prod, 3000 employees, Real Estate | No corp script yet |
| **BN Challenges** (9) | Complete BNs with restrictions | Use `--challenge-mode` flags |
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
- Next achievable targets with hints
- Optimization tips

Options:
```bash
run achievement-tracker.js --show-all       # Show all 98 achievements
run achievement-tracker.js --interval 30000 # Update every 30 seconds
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

# 4. Karma grinding happens automatically (sleeve 0 does homicide)
# Bladeburner skill points save automatically after Overclock max
# Gang strongest member is protected until 10k stat
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

### Phase 4: Long-Term Goals
- Hacking 100k, Combat 3000, Intelligence 255
- All hacknet achievements
- $1 Quintillion, Stock $1Q profit
- Speed run in < 48 hours

### Phase 5: Manual Challenges
- Corporation (5 achievements) - manual play
- BN Challenges (9 achievements) - restricted runs
- Exploits (12 achievements) - community guides

---

## Script Changes for Achievements

| Script | Change | Achievement |
|--------|--------|-------------|
| `sleeve.js` | Sleeve 0 grinds homicide until -1M karma | KARMA_1000000 |
| `bladeburner.js` | Stops spending SP after Overclock max until 100k saved | BLADEBURNER_UNSPENT_100000 |
| `gangs.js` | Strongest member skipped during ascension until 10k stat | GANG_MEMBER_POWER |
| `daemon.js` | Skips servers with <95% hack chance | Better efficiency |
| `achievement-tracker.js` | Complete rewrite tracking all 98 achievements | All tracking |
| `achievement-32gb-script.js` | New file with >32GB RAM cost | SCRIPT_32GB |

---

## Achievement Totals: 98

| Status | Count |
|--------|-------|
| Fully automated | ~55 |
| Newly automated | ~10 |
| Needs config | ~8 |
| Manual required | ~13 |
| Secret/exploit | ~12 |
