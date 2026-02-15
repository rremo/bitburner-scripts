import { log, disableLogs, getConfiguration, formatNumber, formatMoney, getNsDataThroughFile, getActiveSourceFiles } from './helpers.js'

const SAVE_FILE = '/Temp/achievement-progress.json.txt';

/** @param {NS} ns */
export async function main(ns) {
    const argsSchema = [
        ['interval', 60000],
        ['show-all', false],
        ['mark-earned', []], // Manually mark achievement IDs as earned: --mark-earned TRAVEL --mark-earned WORKOUT
    ];

    const options = getConfiguration(ns, argsSchema);
    if (!options) return;

    disableLogs(ns, ['sleep', 'getServerMoneyAvailable', 'getServerMaxRam', 'scan', 'fileExists']);

    // Load previously saved achievement state
    let savedState = loadSavedState(ns);

    // Handle manual marking
    if (options['mark-earned']?.length > 0) {
        for (const id of options['mark-earned']) {
            savedState[id.toUpperCase()] = true;
            ns.tprint(`Marked ${id.toUpperCase()} as earned.`);
        }
        saveSavedState(ns, savedState);
    }

    ns.ui.openTail();

    while (true) {
        ns.clearLog();
        const stats = await getAchievementProgress(ns, savedState);

        // Persist any newly detected achievements
        let changed = false;
        for (const a of stats.achievements) {
            if (a.unlocked && !savedState[a.id]) { savedState[a.id] = true; changed = true; }
        }
        if (changed) saveSavedState(ns, savedState);

        ns.print("=".repeat(62));
        ns.print("  BITBURNER ACHIEVEMENT TRACKER");
        ns.print("=".repeat(62));

        // Overall progress (count saved + detected)
        const knownUnlocked = stats.achievements.filter(a => a.unlocked).length;
        const unknown = stats.achievements.filter(a => a.unlocked === null).length;
        ns.print(`\n  PROGRESS: ${knownUnlocked}/${stats.total}` +
            (unknown > 0 ? ` (+${unknown} unverifiable)` : '') +
            ` (${(knownUnlocked / stats.total * 100).toFixed(1)}%)`);

        // Category breakdown
        ns.print(`\n  BY CATEGORY:`);
        for (const [category, data] of Object.entries(stats.categories)) {
            if (data.total === 0) continue;
            const pct = Math.floor(data.unlocked / data.total * 100);
            const barLen = 15;
            const filled = Math.floor(pct / 100 * barLen);
            const bar = "#".repeat(filled) + "-".repeat(barLen - filled);
            const label = category.padEnd(16);
            const unkStr = data.unknown > 0 ? `+${data.unknown}?` : '';
            ns.print(`  ${label} [${bar}] ${String(pct).padStart(3)}% (${data.unlocked}/${data.total}${unkStr})`);
        }

        // Next targets (only things we know are NOT unlocked)
        const targets = stats.achievements.filter(a => a.unlocked === false && a.type !== 'manual' && a.type !== 'secret');
        if (targets.length > 0) {
            ns.print(`\n  NEXT TARGETS:`);
            for (const t of targets.slice(0, 8)) {
                const prog = t.progress ? ` [${t.progress}]` : '';
                ns.print(`  ${t.type === 'auto' ? '+' : '~'} ${t.name}${prog}`);
                if (t.hint) ns.print(`      ${t.hint}`);
            }
        }

        // Unverifiable achievements
        const unverifiable = stats.achievements.filter(a => a.unlocked === null);
        if (unverifiable.length > 0) {
            ns.print(`\n  UNVERIFIABLE (use --mark-earned ID to mark):`);
            for (const u of unverifiable.slice(0, 6)) {
                ns.print(`  ? ${u.name} (${u.id})`);
            }
        }

        // Tips
        const tips = getTips(stats);
        if (tips.length > 0) {
            ns.print(`\n  TIPS:`);
            for (const tip of tips.slice(0, 4)) {
                ns.print(`  - ${tip}`);
            }
        }

        if (options['show-all']) {
            ns.print(`\n  ALL ACHIEVEMENTS:`);
            for (const a of stats.achievements) {
                const status = a.unlocked === true ? '[x]' : a.unlocked === null ? '[?]' : '[ ]';
                const prog = a.progress ? ` (${a.progress})` : '';
                ns.print(`  ${status} ${a.name}${prog} [${a.category}]`);
            }
        }

        await ns.sleep(options.interval);
    }
}

/** @param {NS} ns */
function loadSavedState(ns) {
    try {
        const data = ns.read(SAVE_FILE);
        if (data) return JSON.parse(data);
    } catch { }
    return {};
}

/** @param {NS} ns */
function saveSavedState(ns, state) {
    ns.write(SAVE_FILE, JSON.stringify(state), 'w');
}

/** @param {NS} ns
 *  @param {Object} savedState - Previously saved achievement state */
async function getAchievementProgress(ns, savedState) {
    const player = ns.getPlayer();
    const sourceFiles = await getActiveSourceFiles(ns, true, true);
    const hasSF4 = (sourceFiles[4] || 0) > 0;
    const hasSF2 = (sourceFiles[2] || 0) > 0;
    const hasSF7 = (sourceFiles[7] || 0) > 0;

    // Gather data using RAM-safe methods
    const karma = ns.heart.break();
    const resetInfo = await getNsDataThroughFile(ns, 'ns.getResetInfo()', '/Temp/ach-resetinfo.txt');
    const ownedSF = resetInfo.ownedSF || {};

    // Augmentation data (requires SF4)
    let installedAugCount = 0;
    let queuedAugCount = 0;
    if (hasSF4) {
        try {
            const installed = await getNsDataThroughFile(ns, 'ns.singularity.getOwnedAugmentations()', '/Temp/ach-augs-installed.txt');
            const all = await getNsDataThroughFile(ns, 'ns.singularity.getOwnedAugmentations(true)', '/Temp/ach-augs-all.txt');
            installedAugCount = installed ? installed.length : 0;
            queuedAugCount = all ? all.length - installed.length : 0;
        } catch { }
    }

    // Gang data (requires SF2)
    let gangData = null;
    if (hasSF2) {
        try {
            const inGang = await getNsDataThroughFile(ns, 'ns.gang.inGang()', '/Temp/ach-ingang.txt');
            if (inGang) {
                gangData = {
                    info: await getNsDataThroughFile(ns, 'ns.gang.getGangInformation()', '/Temp/ach-ganginfo.txt'),
                    members: await getNsDataThroughFile(ns, 'ns.gang.getMemberNames()', '/Temp/ach-gangmembers.txt'),
                };
                if (gangData.members && gangData.members.length > 0) {
                    gangData.memberInfo = await getNsDataThroughFile(ns,
                        'Object.fromEntries(ns.args.map(m => [m, ns.gang.getMemberInformation(m)]))',
                        '/Temp/ach-gangmemberinfo.txt', gangData.members);
                }
            }
        } catch { }
    }

    // Bladeburner data (requires SF7)
    let bbData = null;
    if (hasSF7) {
        try {
            const inBB = await getNsDataThroughFile(ns, 'ns.bladeburner.inBladeburner()', '/Temp/ach-inbb.txt');
            if (inBB) {
                bbData = {
                    rank: await getNsDataThroughFile(ns, 'ns.bladeburner.getRank()', '/Temp/ach-bbrank.txt'),
                    skillPoints: await getNsDataThroughFile(ns, 'ns.bladeburner.getSkillPoints()', '/Temp/ach-bbsp.txt'),
                };
                try {
                    bbData.overclockLevel = await getNsDataThroughFile(ns, 'ns.bladeburner.getSkillLevel("Overclock")', '/Temp/ach-bboc.txt');
                } catch { bbData.overclockLevel = 0; }
            }
        } catch { }
    }

    // Hacknet data
    const numNodes = ns.hacknet.numNodes();
    let hacknetMaxed = false;
    if (numNodes > 0) {
        try {
            const stats0 = ns.hacknet.getNodeStats(0);
            if (stats0.hashCapacity !== undefined) {
                hacknetMaxed = stats0.level >= 300 && stats0.ram >= 8192 && stats0.cores >= 128;
            } else {
                hacknetMaxed = stats0.level >= 200 && stats0.ram >= 64 && stats0.cores >= 16;
            }
        } catch { }
    }

    // Server data
    const homeRam = ns.getServerMaxRam("home");
    const homeCores = await getNsDataThroughFile(ns, 'ns.getServer("home").cpuCores', '/Temp/ach-homecores.txt');

    // Program checks
    const programs = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe", "Formulas.exe"];

    // Script checks
    const homeScripts = ns.ls("home", ".js");
    const has32GBScript = homeScripts.some(s => { try { return ns.getScriptRam(s) >= 32; } catch { return false; } });

    // Running scripts count
    let totalRunningScripts = 0;
    try {
        totalRunningScripts = await getNsDataThroughFile(ns,
            `(() => { let total = 0; const visited = new Set(); const queue = ["home"]; while(queue.length > 0) { const s = queue.shift(); if (visited.has(s)) continue; visited.add(s); try { total += ns.ps(s).length; } catch {} queue.push(...ns.scan(s).filter(n => !visited.has(n))); } return total; })()`,
            '/Temp/ach-running-scripts.txt');
    } catch { }

    // Backdoor check for discount achievement
    let powerhouseBackdoored = false;
    if (hasSF4) {
        try {
            powerhouseBackdoored = await getNsDataThroughFile(ns,
                'ns.getServer("powerhouse-fitness").backdoorInstalled',
                '/Temp/ach-powerhouse.txt');
        } catch { }
    }

    // Has TOR
    const hasTOR = await getNsDataThroughFile(ns, 'ns.hasTorRouter()', '/Temp/ach-tor.txt');

    // Check for drained servers
    let hasDrainedServer = false;
    try {
        hasDrainedServer = await getNsDataThroughFile(ns,
            `(() => { const visited = new Set(); const queue = ["home"]; while(queue.length > 0) { const s = queue.shift(); if (visited.has(s)) continue; visited.add(s); try { if (ns.getServerMaxMoney(s) > 0 && ns.getServerMoneyAvailable(s) === 0) return true; } catch {} queue.push(...ns.scan(s).filter(n => !visited.has(n))); } return false; })()`,
            '/Temp/ach-drained.txt');
    } catch { }

    // Stock data
    let has4S = false;
    try {
        has4S = await getNsDataThroughFile(ns, '(() => { try { return ns.stock.has4SDataTIXAPI(); } catch { return false; } })()', '/Temp/ach-4s.txt');
    } catch { }

    // Sleeve data
    let numSleeves = 0;
    if (sourceFiles[10] || 0) {
        try {
            numSleeves = await getNsDataThroughFile(ns, 'ns.sleeve.getNumSleeves()', '/Temp/ach-sleeves.txt');
        } catch { }
    }

    // Corporation data (hasCorporation is free, 0 GB)
    let corpData = { hasCorp: false, hasLobby: false, hasRealEstate: false, maxEmployees: 0, maxProdMult: 0 };
    try {
        const hasCorp = await getNsDataThroughFile(ns, 'ns.corporation.hasCorporation()', '/Temp/ach-hascorp.txt');
        if (hasCorp) {
            corpData.hasCorp = true;
            try {
                const corpInfo = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()', '/Temp/ach-corpinfo.txt');
                corpData.hasLobby = await getNsDataThroughFile(ns, 'ns.corporation.hasUnlock("Government Partnership")', '/Temp/ach-lobby.txt');
                for (const divName of (corpInfo.divisions || [])) {
                    const div = await getNsDataThroughFile(ns, 'ns.corporation.getDivision(ns.args[0])', '/Temp/ach-corpdiv.txt', [divName]);
                    if (div.type === "Real Estate") corpData.hasRealEstate = true;
                    if (div.productionMult > corpData.maxProdMult) corpData.maxProdMult = div.productionMult;
                    let divEmployees = 0;
                    for (const city of (div.cities || [])) {
                        try {
                            const office = await getNsDataThroughFile(ns, 'ns.corporation.getOffice(ns.args[0], ns.args[1])', '/Temp/ach-corpoffice.txt', [divName, city]);
                            divEmployees += office.numEmployees;
                        } catch { }
                    }
                    if (divEmployees > corpData.maxEmployees) corpData.maxEmployees = divEmployees;
                }
            } catch { /* Corp API calls may fail without sufficient API access */ }
        }
    } catch { }

    // Time in bitnode
    const timeSinceReset = Date.now() - (resetInfo.lastNodeReset || Date.now());

    // Helper: check current state OR saved state
    // Returns true if currently true OR previously saved as true
    // Returns null if we can't check (API not available) and not saved
    // Returns false if we checked and it's not true and not saved
    const check = (id, currentResult) => {
        if (savedState[id]) return true; // Previously earned
        if (currentResult === true) return true; // Currently true
        if (currentResult === null) return null; // Can't verify
        return false;
    };

    // Build achievement list
    const achievements = [];
    const factions = player.factions || [];
    const skills = player.skills || {};

    // === FACTIONS (7) ===
    const factionAchievements = [
        ["CyberSec", "CYBERSEC"], ["NiteSec", "NITESEC"], ["The Black Hand", "THE_BLACK_HAND"],
        ["BitRunners", "BITRUNNERS"], ["Daedalus", "DAEDALUS"],
        ["The Covenant", "THE_COVENANT"], ["Illuminati", "ILLUMINATI"]
    ];
    for (const [fname, id] of factionAchievements) {
        achievements.push({ id, name: `Join ${fname}`, category: "Factions", unlocked: check(id, factions.includes(fname)), type: 'auto' });
    }

    // === PROGRAMS (6) ===
    for (const prog of programs) {
        const id = prog.toUpperCase().replace('.', '_');
        achievements.push({ id, name: `Acquire ${prog}`, category: "Programs", unlocked: check(id, ns.fileExists(prog, "home")), type: 'auto' });
    }

    // === SOURCE FILES (12) ===
    for (let i = 1; i <= 12; i++) {
        const id = `SF${i}.1`;
        const level = ownedSF[i] || 0;
        achievements.push({ id, name: `Source-File ${i}`, category: "Source Files", unlocked: check(id, level >= 1), type: 'auto', progress: level > 0 ? `Lv.${level}` : null });
    }

    // === MONEY (3) ===
    achievements.push({ id: 'MONEY_1Q', name: 'Earn $1 Quintillion', category: "Money", unlocked: check('MONEY_1Q', player.money >= 1e18), type: 'auto', progress: `${formatMoney(player.money)}` });
    achievements.push({ id: 'MONEY_M1B', name: 'Reach -$1B Debt', category: "Money", unlocked: check('MONEY_M1B', player.money <= -1e9), type: 'tweakable', hint: 'Overspend on augs before reset' });
    // Stock profit is not directly trackable via NS API
    achievements.push({ id: 'STOCK_1q', name: '$1Q Stock Profits', category: "Money", unlocked: check('STOCK_1q', null), type: 'auto', hint: 'Not trackable via API. Use --mark-earned STOCK_1q' });

    // === AUGMENTATIONS (4) ===
    achievements.push({ id: 'INSTALL_1', name: 'Install 1 Augmentation', category: "Augmentations", unlocked: check('INSTALL_1', hasSF4 ? installedAugCount >= 1 : null), type: 'auto' });
    achievements.push({ id: 'INSTALL_100', name: 'Install 100 Augmentations', category: "Augmentations", unlocked: check('INSTALL_100', hasSF4 ? installedAugCount >= 100 : null), type: 'auto', progress: hasSF4 ? `${installedAugCount}/100` : 'Need SF4' });
    achievements.push({ id: 'QUEUE_40', name: 'Queue 40 Augmentations', category: "Augmentations", unlocked: check('QUEUE_40', hasSF4 ? queuedAugCount >= 40 : null), type: 'auto', progress: hasSF4 ? `${queuedAugCount}/40` : 'Need SF4' });
    achievements.push({ id: 'NEUROFLUX_255', name: 'Neuroflux Lv.255', category: "Augmentations", unlocked: check('NEUROFLUX_255', null), type: 'auto', hint: 'Not trackable. Use --mark-earned NEUROFLUX_255' });

    // === SKILLS (3) ===
    achievements.push({ id: 'HACKING_100000', name: 'Hacking >= 100k', category: "Skills", unlocked: check('HACKING_100000', (skills.hacking || 0) >= 100000), type: 'auto', progress: `${formatNumber(skills.hacking || 0)}/100k` });
    const combatMin = Math.min(skills.strength || 0, skills.defense || 0, skills.dexterity || 0, skills.agility || 0);
    achievements.push({ id: 'COMBAT_3000', name: 'All Combat >= 3000', category: "Skills", unlocked: check('COMBAT_3000', combatMin >= 3000), type: 'tweakable', progress: `${formatNumber(combatMin)}/3000`, hint: 'sleeve.js --train-to-* 3000' });
    achievements.push({ id: 'INTELLIGENCE_255', name: 'Intelligence >= 255', category: "Skills", unlocked: check('INTELLIGENCE_255', (skills.intelligence || 0) >= 255), type: 'tweakable', hint: 'farm-intelligence.js in BN5' });

    // === SCRIPTS (3) ===
    achievements.push({ id: 'NS2', name: 'Have NS2 Script', category: "Scripts", unlocked: check('NS2', true), type: 'auto' });
    achievements.push({ id: 'SCRIPT_32GB', name: 'Script >= 32GB RAM', category: "Scripts", unlocked: check('SCRIPT_32GB', has32GBScript), type: 'tweakable', hint: 'achievement-32gb-script.js' });
    achievements.push({ id: 'RUNNING_SCRIPTS_1000', name: 'Run 1000 Scripts', category: "Scripts", unlocked: check('RUNNING_SCRIPTS_1000', totalRunningScripts >= 1000), type: 'tweakable', progress: `${totalRunningScripts}/1000` });

    // === SERVER (3) ===
    // Drain server is a momentary check - server may have regrown
    achievements.push({ id: 'DRAIN_SERVER', name: 'Drain a Server', category: "Server", unlocked: check('DRAIN_SERVER', hasDrainedServer || null), type: 'auto' });
    achievements.push({ id: 'MAX_RAM', name: 'Max Home RAM (2^30)', category: "Server", unlocked: check('MAX_RAM', homeRam >= 1073741824), type: 'auto', progress: `${formatNumber(homeRam)}/${formatNumber(1073741824)}` });
    achievements.push({ id: 'MAX_CORES', name: 'Max Home Cores (8)', category: "Server", unlocked: check('MAX_CORES', (homeCores || 0) >= 8), type: 'auto', progress: `${homeCores || 0}/8` });

    // === HACKNET (9) ===
    achievements.push({ id: 'FIRST_HACKNET_NODE', name: 'Buy Hacknet Node', category: "Hacknet", unlocked: check('FIRST_HACKNET_NODE', numNodes >= 1), type: 'auto' });
    achievements.push({ id: '30_HACKNET_NODE', name: 'Own 30 Hacknet Nodes', category: "Hacknet", unlocked: check('30_HACKNET_NODE', numNodes >= 30), type: 'auto', progress: `${numNodes}/30` });
    achievements.push({ id: 'MAX_HACKNET_NODE', name: 'Max a Hacknet Node', category: "Hacknet", unlocked: check('MAX_HACKNET_NODE', hacknetMaxed || null), type: 'tweakable' });
    // These hacknet income achievements are not trackable via NS API
    achievements.push({ id: 'HACKNET_NODE_10M', name: '$10M from Hacknet', category: "Hacknet", unlocked: check('HACKNET_NODE_10M', null), type: 'auto', hint: '--mark-earned HACKNET_NODE_10M' });
    achievements.push({ id: 'FIRST_HACKNET_SERVER', name: 'Buy Hacknet Server', category: "Hacknet", unlocked: check('FIRST_HACKNET_SERVER', null), type: 'auto', hint: '--mark-earned FIRST_HACKNET_SERVER' });
    achievements.push({ id: 'ALL_HACKNET_SERVER', name: 'Own All Hacknet Servers', category: "Hacknet", unlocked: check('ALL_HACKNET_SERVER', null), type: 'tweakable' });
    achievements.push({ id: 'MAX_HACKNET_SERVER', name: 'Max a Hacknet Server', category: "Hacknet", unlocked: check('MAX_HACKNET_SERVER', null), type: 'tweakable' });
    achievements.push({ id: 'HACKNET_SERVER_1B', name: '$1B from HN Servers', category: "Hacknet", unlocked: check('HACKNET_SERVER_1B', null), type: 'auto' });
    achievements.push({ id: 'MAX_CACHE', name: 'Fill Hash Capacity', category: "Hacknet", unlocked: check('MAX_CACHE', null), type: 'tweakable', hint: 'Let hashes fill once' });

    // === GANG (4) ===
    const hasGang = gangData !== null;
    const gangMemberCount = gangData?.members?.length || 0;
    const gangTerritory = gangData?.info?.territory || 0;
    let maxMemberStat = 0;
    if (gangData?.memberInfo) {
        for (const info of Object.values(gangData.memberInfo)) {
            maxMemberStat = Math.max(maxMemberStat, info.hack || 0, info.str || 0, info.def || 0, info.dex || 0, info.agi || 0, info.cha || 0);
        }
    }
    achievements.push({ id: 'GANG', name: 'Form a Gang', category: "Gang", unlocked: check('GANG', hasGang), type: 'auto' });
    achievements.push({ id: 'FULL_GANG', name: 'Recruit All Members', category: "Gang", unlocked: check('FULL_GANG', gangMemberCount >= 12), type: 'auto', progress: hasGang ? `${gangMemberCount}/12` : null });
    achievements.push({ id: 'GANG_TERRITORY', name: '100% Territory', category: "Gang", unlocked: check('GANG_TERRITORY', gangTerritory >= 0.999), type: 'auto', progress: hasGang ? `${(gangTerritory * 100).toFixed(1)}%` : null });
    achievements.push({ id: 'GANG_MEMBER_POWER', name: 'Member 10k Stat', category: "Gang", unlocked: check('GANG_MEMBER_POWER', maxMemberStat >= 10000), type: 'tweakable', progress: hasGang ? `${formatNumber(maxMemberStat)}/10k` : null });

    // === BLADEBURNER (3) ===
    const inBB = bbData !== null;
    achievements.push({ id: 'BLADEBURNER_DIVISION', name: 'Join Bladeburner', category: "Bladeburner", unlocked: check('BLADEBURNER_DIVISION', inBB), type: 'auto' });
    achievements.push({ id: 'BLADEBURNER_OVERCLOCK', name: 'Max Overclock', category: "Bladeburner", unlocked: check('BLADEBURNER_OVERCLOCK', (bbData?.overclockLevel || 0) >= 90), type: 'auto', progress: inBB ? `${bbData?.overclockLevel || 0}/90` : null });
    achievements.push({ id: 'BLADEBURNER_UNSPENT_100000', name: '100k Unspent SP', category: "Bladeburner", unlocked: check('BLADEBURNER_UNSPENT_100000', (bbData?.skillPoints || 0) >= 100000), type: 'tweakable', progress: inBB ? `${formatNumber(bbData?.skillPoints || 0)}/100k` : null });

    // === REPUTATION (2) - Not directly trackable ===
    achievements.push({ id: 'REPUTATION_10M', name: '10M Faction Rep', category: "Reputation", unlocked: check('REPUTATION_10M', null), type: 'auto', hint: '--mark-earned REPUTATION_10M' });
    achievements.push({ id: 'DONATION', name: 'Unlock Donations', category: "Reputation", unlocked: check('DONATION', null), type: 'auto', hint: '--mark-earned DONATION' });

    // === LIFESTYLE (4) ===
    // Travel checks current city - but you may have traveled and come back
    achievements.push({ id: 'TRAVEL', name: 'Travel to Another City', category: "Lifestyle", unlocked: check('TRAVEL', player.city !== "Sector-12"), type: 'auto' });
    achievements.push({ id: 'TOR', name: 'Buy TOR Router', category: "Lifestyle", unlocked: check('TOR', hasTOR), type: 'auto' });
    // Workout is not checkable unless currently working out
    achievements.push({ id: 'WORKOUT', name: 'Work Out at Gym', category: "Lifestyle", unlocked: check('WORKOUT', null), type: 'auto', hint: '--mark-earned WORKOUT' });
    achievements.push({ id: 'SCRIPTS_30', name: '30 Scripts on Home', category: "Lifestyle", unlocked: check('SCRIPTS_30', homeScripts.length >= 30), type: 'auto', progress: `${homeScripts.length}/30` });

    // === STOCK (2) ===
    achievements.push({ id: '4S', name: 'Purchase 4S Data', category: "Stock", unlocked: check('4S', has4S), type: 'auto' });

    // === MISC (3) ===
    achievements.push({ id: 'HOSPITALIZED', name: 'Go to Hospital', category: "Misc", unlocked: check('HOSPITALIZED', null), type: 'tweakable', hint: '--mark-earned HOSPITALIZED' });
    achievements.push({ id: 'DISCOUNT', name: 'Backdoor powerhouse-fitness', category: "Misc", unlocked: check('DISCOUNT', powerhouseBackdoored), type: 'auto' });
    achievements.push({ id: 'SLEEVE_8', name: 'Own All 8 Sleeves', category: "Misc", unlocked: check('SLEEVE_8', numSleeves >= 8 && (ownedSF[10] || 0) >= 3), type: 'tweakable', progress: `${numSleeves}/8 sleeves, SF10.${ownedSF[10] || 0}/3` });

    // === SPEED / KARMA (2) ===
    achievements.push({ id: 'FAST_BN', name: 'Destroy BN < 48h', category: "Speed", unlocked: check('FAST_BN', null), type: 'tweakable', progress: `${(timeSinceReset / 3600000).toFixed(1)}h elapsed`, hint: '--mark-earned FAST_BN' });
    achievements.push({ id: 'KARMA_1000000', name: 'Karma <= -1M', category: "Speed", unlocked: check('KARMA_1000000', karma <= -1e6), type: 'tweakable', progress: `${formatNumber(Math.abs(karma))}/-1M` });

    // === CORPORATION (5) ===
    achievements.push({ id: 'CORPORATION', name: 'Create Corporation', category: "Corporation", unlocked: check('CORPORATION', corpData.hasCorp), type: 'auto' });
    achievements.push({ id: 'CORPORATION_BRIBE', name: 'Unlock Lobbying', category: "Corporation", unlocked: check('CORPORATION_BRIBE', corpData.hasCorp ? corpData.hasLobby : null), type: 'auto' });
    achievements.push({ id: 'CORPORATION_PROD_1000', name: 'Production x1000', category: "Corporation", unlocked: check('CORPORATION_PROD_1000', corpData.hasCorp ? corpData.maxProdMult >= 1000 : null), type: 'auto', progress: corpData.hasCorp ? `${corpData.maxProdMult.toFixed(0)}x/1000x` : null });
    achievements.push({ id: 'CORPORATION_EMPLOYEE_3000', name: '3000 Employees', category: "Corporation", unlocked: check('CORPORATION_EMPLOYEE_3000', corpData.hasCorp ? corpData.maxEmployees >= 3000 : null), type: 'auto', progress: corpData.hasCorp ? `${corpData.maxEmployees}/3000` : null });
    achievements.push({ id: 'CORPORATION_REAL_ESTATE', name: 'Real Estate Division', category: "Corporation", unlocked: check('CORPORATION_REAL_ESTATE', corpData.hasCorp ? corpData.hasRealEstate : null), type: 'auto' });

    // === CHALLENGES (11) ===
    const challengeBNs = [
        [1, "BN1: 128GB+1Core"], [2, "BN2: No Gang"], [3, "BN3: No Corp"],
        [6, "BN6: No BB"], [7, "BN7: No BB"], [8, "BN8: No 4S"],
        [9, "BN9: No Hacknet$"], [10, "BN10: No Sleeves"], [13, "BN13: No Stanek"]
    ];
    for (const [bn, desc] of challengeBNs) {
        const id = `CHALLENGE_BN${bn}`;
        achievements.push({ id, name: desc, category: "Challenges", unlocked: check(id, null), type: 'manual', hint: `--mark-earned ${id}` });
    }
    achievements.push({ id: 'CHALLENGE_BN12', name: 'BN12: Level 50', category: "Challenges", unlocked: check('CHALLENGE_BN12', (ownedSF[12] || 0) >= 50), type: 'manual', progress: `SF12.${ownedSF[12] || 0}/50` });
    achievements.push({ id: 'INDECISIVE', name: '1h in BitVerse', category: "Challenges", unlocked: check('INDECISIVE', null), type: 'manual', hint: `--mark-earned INDECISIVE` });

    // === SECRET/EXPLOIT (12) ===
    const exploits = ["BYPASS", "PROTOTYPETAMPERING", "UNCLICKABLE", "UNDOCUMENTEDFUNCTIONCALL",
        "TIMECOMPRESSION", "REALITYALTERATION", "N00DLES", "EDITSAVEFILE", "DEVMENU", "RAINBOW", "TRUE_RECURSION"];
    for (const e of exploits) {
        achievements.push({ id: e, name: `Exploit: ${e.toLowerCase()}`, category: "Exploits", unlocked: check(e, null), type: 'secret' });
    }
    achievements.push({ id: 'UNACHIEVABLE', name: 'UNACHIEVABLE', category: "Exploits", unlocked: check('UNACHIEVABLE', null), type: 'secret' });

    // Build category stats
    const categories = {};
    for (const a of achievements) {
        if (!categories[a.category]) categories[a.category] = { total: 0, unlocked: 0, unknown: 0 };
        categories[a.category].total++;
        if (a.unlocked === true) categories[a.category].unlocked++;
        if (a.unlocked === null) categories[a.category].unknown++;
    }

    const unlocked = achievements.filter(a => a.unlocked === true).length;
    const secretCount = achievements.filter(a => a.type === 'secret').length;
    const manualCount = achievements.filter(a => a.type === 'manual' && a.unlocked !== true).length;

    return { total: achievements.length, unlocked, secretCount, manualCount, categories, achievements };
}

/** @param {{achievements: Array}} stats */
function getTips(stats) {
    const tips = [];
    const locked = stats.achievements.filter(a => a.unlocked === false);
    const tweakable = locked.filter(a => a.type === 'tweakable');
    const unknown = stats.achievements.filter(a => a.unlocked === null);

    if (tweakable.length > 0 && tweakable[0].hint)
        tips.push(`${tweakable[0].name}: ${tweakable[0].hint}`);

    if (unknown.length > 0)
        tips.push(`${unknown.length} achievements can't be verified - use --mark-earned ID for ones you have`);

    const sfDone = stats.categories["Source Files"]?.unlocked || 0;
    if (sfDone < 12) tips.push(`${12 - sfDone} source files remaining`);

    if (locked.length > 0) tips.push(`${locked.length} achievements still to earn`);

    return tips;
}
