import { log, disableLogs, getConfiguration, formatNumber, formatMoney } from './helpers.js'

/** @param {NS} ns */
export async function main(ns) {
    const argsSchema = [
        ['interval', 60000], // Check every 60 seconds
        ['show-locked', false], // Show locked achievements
        ['focus-category', null], // Focus on specific category
    ];

    const options = getConfiguration(ns, argsSchema);
    if (!options) return;

    disableLogs(ns, ['sleep', 'getServerMoneyAvailable']);

    ns.tail();
    ns.clearLog();

    // Achievement tracking system
    const achievements = await analyzeAchievements(ns);

    while (true) {
        ns.clearLog();
        ns.print("=".repeat(60));
        ns.print("🏆 BITBURNER ACHIEVEMENT TRACKER");
        ns.print("=".repeat(60));

        const stats = await getAchievementProgress(ns);

        // Summary
        ns.print(`\n📊 OVERALL PROGRESS:`);
        ns.print(`Unlocked: ${stats.unlocked}/${stats.total} (${(stats.unlocked/stats.total*100).toFixed(1)}%)`);
        ns.print(`Remaining: ${stats.locked}`);
        ns.print(`Secret/Hidden: ${stats.secret}`);

        // Category breakdown
        ns.print(`\n📁 BY CATEGORY:`);
        for (const [category, data] of Object.entries(stats.categories)) {
            const pct = (data.unlocked / data.total * 100).toFixed(0);
            const bar = "█".repeat(Math.floor(pct/5)) + "░".repeat(20 - Math.floor(pct/5));
            ns.print(`${category.padEnd(20)} [${bar}] ${pct}% (${data.unlocked}/${data.total})`);
        }

        // Next achievable targets
        ns.print(`\n🎯 NEXT TARGETS (Easy wins):`);
        const targets = await getNextTargets(ns);
        for (const target of targets.slice(0, 10)) {
            ns.print(`  ${target.icon} ${target.name}`);
            ns.print(`     ${target.requirement}`);
            if (target.progress) ns.print(`     Progress: ${target.progress}`);
        }

        // Achievement tips
        ns.print(`\n💡 OPTIMIZATION TIPS:`);
        const tips = await getAchievementTips(ns);
        for (const tip of tips.slice(0, 5)) {
            ns.print(`  • ${tip}`);
        }

        await ns.sleep(options.interval);
    }
}

/** @param {NS} ns */
async function getAchievementProgress(ns) {
    const player = ns.getPlayer();

    // Count achievements by category
    const categories = {
        "Factions": { total: 7, unlocked: player.factions.filter(f =>
            ["CyberSec", "NiteSec", "The Black Hand", "BitRunners", "Daedalus",
             "The Covenant", "Illuminati"].includes(f)).length },
        "Source Files": { total: 12, unlocked: Object.values(player.sourceFiles).length },
        "Augmentations": { total: 4, unlocked: 0 },
        "Skills": { total: 3, unlocked: 0 },
        "Money": { total: 3, unlocked: 0 },
        "Gangs": { total: 4, unlocked: 0 },
        "Corporation": { total: 5, unlocked: 0 },
        "Bladeburner": { total: 3, unlocked: 0 },
        "Hacknet": { total: 10, unlocked: 0 },
        "Challenges": { total: 11, unlocked: 0 },
    };

    // Check augmentation achievements
    if (player.augmentations && player.augmentations.length > 0) categories["Augmentations"].unlocked++;
    if (player.augmentations && player.augmentations.length >= 100) categories["Augmentations"].unlocked++;
    if (player.queuedAugmentations && player.queuedAugmentations.length >= 40) categories["Augmentations"].unlocked++;
    const nfLevel = player.augmentations?.find(a => a.name === "Neuroflux Governor")?.level || 0;
    if (nfLevel >= 255) categories["Augmentations"].unlocked++;

    // Check skill achievements
    if (player.skills.hacking >= 100000) categories["Skills"].unlocked++;
    if (player.skills.strength >= 3000 && player.skills.defense >= 3000 &&
        player.skills.dexterity >= 3000 && player.skills.agility >= 3000) categories["Skills"].unlocked++;
    if (player.skills.intelligence >= 255) categories["Skills"].unlocked++;

    // Check money achievements
    if (player.money >= 1e18) categories["Money"].unlocked++;
    if (player.money <= -1e9) categories["Money"].unlocked++;

    const total = Object.values(categories).reduce((sum, cat) => sum + cat.total, 0);
    const unlocked = Object.values(categories).reduce((sum, cat) => sum + cat.unlocked, 0);

    return {
        total: 98, // Total Steam achievements
        unlocked: unlocked,
        locked: 98 - unlocked,
        secret: 14,
        categories: categories
    };
}

/** @param {NS} ns */
async function getNextTargets(ns) {
    const player = ns.getPlayer();
    const targets = [];

    // Faction targets
    const topFactions = ["Daedalus", "The Covenant", "Illuminati"];
    for (const faction of topFactions) {
        if (!player.factions.includes(faction)) {
            targets.push({
                icon: "👥",
                name: `Join ${faction}`,
                requirement: faction === "Daedalus" ? "100k hacking + 100 augs" :
                            faction === "The Covenant" ? "20 augs" : "30 augs",
                priority: 1
            });
        }
    }

    // Money target
    if (player.money < 1e18) {
        targets.push({
            icon: "💰",
            name: "Earn 1 Quintillion",
            requirement: `Current: ${formatMoney(player.money)}`,
            progress: `${(player.money / 1e18 * 100).toFixed(2)}%`,
            priority: 2
        });
    }

    // Augmentation targets
    const augCount = player.augmentations?.length || 0;
    if (augCount < 100) {
        targets.push({
            icon: "🧬",
            name: "Install 100 Augmentations",
            requirement: `Install ${100 - augCount} more augmentations`,
            progress: `${augCount}/100`,
            priority: 2
        });
    }

    // Queue target
    const queuedCount = player.queuedAugmentations?.length || 0;
    if (queuedCount < 40) {
        targets.push({
            icon: "📋",
            name: "Queue 40 Augmentations",
            requirement: `Queue ${40 - queuedCount} more augmentations`,
            progress: `${queuedCount}/40`,
            priority: 3
        });
    }

    // Skill targets
    if (player.skills.hacking < 100000) {
        targets.push({
            icon: "🎯",
            name: "Reach 100k Hacking",
            requirement: `Gain ${formatNumber(100000 - player.skills.hacking)} more hacking`,
            progress: `${(player.skills.hacking / 100000 * 100).toFixed(1)}%`,
            priority: 2
        });
    }

    const combatMin = Math.min(player.skills.strength, player.skills.defense,
                                player.skills.dexterity, player.skills.agility);
    if (combatMin < 3000) {
        targets.push({
            icon: "💪",
            name: "Reach 3000 All Combat Stats",
            requirement: `Train lowest stat from ${formatNumber(combatMin)} to 3000`,
            progress: `${(combatMin / 3000 * 100).toFixed(1)}%`,
            priority: 4
        });
    }

    // TOR router (easy win)
    if (!player.tor) {
        targets.push({
            icon: "🌐",
            name: "Purchase TOR Router",
            requirement: "Buy from Alpha Enterprises (Aevum) for $200k",
            priority: 1
        });
    }

    // 4S Data (if affordable)
    const has4S = await ns.stock.has4SDataTIXAPI();
    if (!has4S && player.money >= 25e9) {
        targets.push({
            icon: "📈",
            name: "Purchase 4S Market Data",
            requirement: "Buy for $25 billion (currently affordable!)",
            priority: 1
        });
    }

    return targets.sort((a, b) => a.priority - b.priority);
}

/** @param {NS} ns */
async function getAchievementTips(ns) {
    const tips = [];
    const player = ns.getPlayer();

    // Faction tips
    if (!player.factions.includes("Daedalus")) {
        tips.push("Focus on getting 100k hacking + 100 augs to join Daedalus (7 faction achievements)");
    }

    // Augmentation tips
    const augCount = player.augmentations?.length || 0;
    if (augCount < 100) {
        tips.push("Use faction-manager.js --purchase to auto-buy augmentations toward 100 aug achievement");
    }

    // Neuroflux tip
    const nfLevel = player.augmentations?.find(a => a.name === "Neuroflux Governor")?.level || 0;
    if (nfLevel < 255) {
        tips.push(`Neuroflux Governor is at level ${nfLevel}/255 - keep buying for achievement`);
    }

    // Combat training tip
    const combatMin = Math.min(player.skills.strength, player.skills.defense,
                                player.skills.dexterity, player.skills.agility);
    if (combatMin < 3000) {
        tips.push("Run sleeve.js with higher --train-to-* values to reach 3000 combat stats achievement");
    }

    // Gang tip
    if (player.inGang && player.karma < -54000) {
        tips.push("You can form a gang! This unlocks 4 gang achievements");
    }

    // Speed run tip
    const resetInfo = ns.getResetInfo();
    const timeSinceReset = Date.now() - resetInfo.lastNodeReset;
    if (timeSinceReset < 24 * 60 * 60 * 1000) {
        tips.push(`You're ${(timeSinceReset / (60*60*1000)).toFixed(1)}h into this BitNode - destroy it under 48h for speed achievement!`);
    }

    // Hacknet tip
    tips.push("Run hacknet-upgrade-manager.js to work toward hacknet achievements");

    // Stock tip
    if (player.money >= 25e9) {
        tips.push("You can afford 4S Market Data - buy it for stock market achievement!");
    }

    return tips;
}

/** @param {NS} ns */
async function analyzeAchievements(ns) {
    // This would parse the actual achievement data if needed
    return {
        total: 98,
        categories: [
            "Factions", "Source Files", "Augmentations", "Skills", "Money",
            "Gangs", "Corporation", "Bladeburner", "Hacknet", "Challenges"
        ]
    };
}
