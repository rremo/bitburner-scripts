import { scanAllServers, getConfiguration, disableLogs } from './helpers.js'

const argsSchema = [
    ['target-count', 1000], // Target number of running scripts for the achievement
    ['sleep-time', 60000], // How long each mini-script sleeps (ms) before self-terminating
];

export function autocomplete(data, _) {
    data.flags(argsSchema);
    return [];
}

/** @param {NS} ns
 * Launches many minimal scripts across the network to trigger the RUNNING_SCRIPTS_1000 achievement.
 * Each script instance needs 1.6GB RAM, so ~1.6TB total network RAM is required for 1000 scripts. */
export async function main(ns) {
    const options = getConfiguration(ns, argsSchema);
    if (!options) return;
    disableLogs(ns, ['sleep', 'scp', 'exec', 'scan', 'getServerMaxRam', 'getServerUsedRam', 'hasRootAccess']);

    const targetCount = options['target-count'];
    const sleepTime = options['sleep-time'];

    ns.tprint(`INFO: Attempting to launch ${targetCount} scripts for RUNNING_SCRIPTS_1000 achievement...`);

    // Create a minimal sleep script on home (1.6GB base cost)
    const miniScript = '/Temp/achieve-sleep.js';
    ns.write(miniScript, 'export async function main(ns) { await ns.sleep(ns.args[0] || 60000); }', 'w');

    const allServers = scanAllServers(ns);
    let totalLaunched = 0;
    const serverStats = [];

    for (const server of allServers) {
        if (totalLaunched >= targetCount) break;
        if (!ns.hasRootAccess(server)) continue;

        const maxRam = ns.getServerMaxRam(server);
        const usedRam = ns.getServerUsedRam(server);
        const freeRam = maxRam - usedRam;
        const scriptRam = 1.6; // Minimum NS script RAM cost

        if (freeRam < scriptRam) continue;

        // Copy mini script to the target server
        if (server !== 'home')
            ns.scp(miniScript, server);

        // Launch as many instances as possible (unique args = unique processes)
        const maxInstances = Math.min(
            Math.floor(freeRam / scriptRam),
            targetCount - totalLaunched
        );

        let launched = 0;
        for (let i = 0; i < maxInstances; i++) {
            const pid = ns.exec(miniScript, server, 1, sleepTime, `${totalLaunched + i}`);
            if (pid > 0) {
                totalLaunched++;
                launched++;
            } else {
                break; // Server is full
            }
        }

        if (launched > 0)
            serverStats.push(`${server}: ${launched}`);

        if (totalLaunched % 200 === 0 && totalLaunched > 0)
            ns.print(`Launched ${totalLaunched}/${targetCount} scripts...`);
    }

    // Report results
    ns.tprint(`INFO: Distribution across ${serverStats.length} servers:`);
    for (const stat of serverStats)
        ns.tprint(`  ${stat}`);

    if (totalLaunched >= targetCount)
        ns.tprint(`SUCCESS: Launched ${totalLaunched} scripts! RUNNING_SCRIPTS_1000 achievement should trigger.`);
    else {
        const neededTB = ((targetCount - totalLaunched) * 1.6 / 1024).toFixed(1);
        ns.tprint(`WARNING: Only launched ${totalLaunched}/${targetCount} scripts. Need ~${neededTB}TB more network RAM.`);
        ns.tprint(`TIP: Buy more purchased servers via host-manager.js or upgrade home RAM.`);
    }

    ns.tprint(`INFO: Mini-scripts will auto-terminate in ${sleepTime / 1000}s.`);
    await ns.sleep(sleepTime + 1000);
    ns.tprint(`INFO: All mini-scripts have finished.`);
}
