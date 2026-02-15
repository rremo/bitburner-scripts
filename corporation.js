import { log, getConfiguration, disableLogs, getNsDataThroughFile, formatMoney, formatNumber, getActiveSourceFiles } from './helpers.js'

const argsSchema = [
    ['corp-name', 'NoodleCorp'], // Corporation name
    ['interval', 5000], // Main loop interval (ms)
    ['self-fund', true], // Self-fund the corp ($150B). Set to false in BN3 where it's free.
];

export function autocomplete(data, _) {
    data.flags(argsSchema);
    return [];
}

const cities = ["Sector-12", "Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven"];

// Helper to call corporation API via RAM-dodging
async function corp(ns, command, file, args) {
    return await getNsDataThroughFile(ns, `ns.corporation.${command}`, `/Temp/corp-${file}.txt`, args);
}

/** @param {NS} ns
 * Automates corporation management targeting 5 Steam achievements:
 * 1. CORPORATION - Create a corporation
 * 2. CORPORATION_REAL_ESTATE - Create a Real Estate division
 * 3. CORPORATION_EMPLOYEE_3000 - Have 3000+ employees in one division
 * 4. CORPORATION_PROD_1000 - Division with productionMult >= 1000
 * 5. CORPORATION_BRIBE - Unlock Government Partnership (Lobbying)
 */
export async function main(ns) {
    const options = getConfiguration(ns, argsSchema);
    if (!options) return;

    disableLogs(ns, ['sleep', 'getServerMoneyAvailable']);

    const corpName = options['corp-name'];
    const selfFund = options['self-fund'];

    // Achievement tracking
    const achieved = { corp: false, realEstate: false, employees: false, production: false, lobbying: false };

    // Phase 0: Create corporation if needed
    if (!ns.corporation.hasCorporation()) {
        const canCreate = await corp(ns, `canCreateCorporation(${selfFund})`, 'can-create');
        if (!canCreate) {
            ns.tprint(`ERROR: Cannot create corporation. ${selfFund ? 'Need $150B (or use --self-fund false in BN3).' : 'Free creation not available outside BN3.'}`);
            return;
        }
        await corp(ns, `createCorporation(ns.args[0], ${selfFund})`, 'create', [corpName]);
        log(ns, `SUCCESS: Created corporation "${corpName}"!`, true, 'success');
    }
    achieved.corp = true;
    log(ns, `INFO: Corporation exists. Starting management loop...`, true);

    // Phase 1: Set up initial Agriculture division
    const agDiv = "Agriculture";
    const reDiv = "RealEstate";
    await ensureDivision(ns, agDiv, "Agriculture");

    // Main management loop
    while (true) {
        try {
            const corpInfo = await corp(ns, 'getCorporation()', 'info');
            const funds = corpInfo.funds;
            const divisions = corpInfo.divisions || [];

            // Phase 1: Expand Agriculture to all cities and set up basics
            if (divisions.includes(agDiv)) {
                await expandToAllCities(ns, agDiv);
                await hireAndAssignEmployees(ns, agDiv);
                await setupWarehousesAndProduction(ns, agDiv);
            }

            // Phase 2: Create Real Estate division (achievement)
            if (!achieved.realEstate && funds > 50e9) {
                if (!divisions.includes(reDiv)) {
                    try {
                        await ensureDivision(ns, reDiv, "Real Estate");
                        log(ns, `SUCCESS: Created Real Estate division! CORPORATION_REAL_ESTATE achievement should unlock.`, true, 'success');
                    } catch (e) {
                        log(ns, `INFO: Cannot create Real Estate division yet: ${e}`, false);
                    }
                }
                if (divisions.includes(reDiv)) achieved.realEstate = true;
            }

            // Phase 3: Upgrade offices and hire toward 3000 employees
            const agDivInfo = await corp(ns, `getDivision(ns.args[0])`, 'div-ag', [agDiv]);
            let totalEmployees = 0;
            for (const city of agDivInfo.cities || []) {
                const office = await corp(ns, `getOffice(ns.args[0], ns.args[1])`, `office-${city}`, [agDiv, city]);
                totalEmployees += office.numEmployees;

                // Upgrade office and hire more employees if affordable
                if (office.numEmployees >= office.size && funds > 1e9) {
                    const upgSize = Math.min(15, Math.max(3, Math.floor(funds / 1e10))); // Scale upgrade size with wealth
                    try {
                        await corp(ns, `upgradeOfficeSize(ns.args[0], ns.args[1], ${upgSize})`, `upg-office-${city}`, [agDiv, city]);
                        // Hire to fill new slots
                        for (let i = 0; i < upgSize; i++) {
                            await corp(ns, `hireEmployee(ns.args[0], ns.args[1])`, `hire-${city}`, [agDiv, city]);
                        }
                        await assignJobs(ns, agDiv, city);
                    } catch (e) { /* Insufficient funds or at max */ }
                }
            }
            if (totalEmployees >= 3000 && !achieved.employees) {
                log(ns, `SUCCESS: ${totalEmployees} employees! CORPORATION_EMPLOYEE_3000 achievement should unlock.`, true, 'success');
                achieved.employees = true;
            }

            // Phase 4: Track production multiplier
            if (agDivInfo.productionMult >= 1000 && !achieved.production) {
                log(ns, `SUCCESS: Production multiplier ${agDivInfo.productionMult.toFixed(0)}x! CORPORATION_PROD_1000 achievement should unlock.`, true, 'success');
                achieved.production = true;
            }

            // Phase 5: Level upgrades to boost production
            await levelUpgrades(ns, funds);

            // Phase 6: Accept investment offers when available to grow funds
            await maybeAcceptInvestment(ns, corpInfo);

            // Phase 7: Purchase Government Partnership (Lobbying achievement)
            if (!achieved.lobbying) {
                const hasLobby = await corp(ns, `hasUnlock("Government Partnership")`, 'has-lobby');
                if (hasLobby) {
                    log(ns, `SUCCESS: Government Partnership unlocked! CORPORATION_BRIBE achievement should unlock.`, true, 'success');
                    achieved.lobbying = true;
                } else if (funds > 100e9) {
                    try {
                        const cost = await corp(ns, `getUnlockCost("Government Partnership")`, 'lobby-cost');
                        if (funds > cost * 1.5) { // Only buy if we have 1.5x the cost
                            await corp(ns, `purchaseUnlock("Government Partnership")`, 'buy-lobby');
                            log(ns, `SUCCESS: Purchased Government Partnership for ${formatMoney(cost)}!`, true, 'success');
                            achieved.lobbying = true;
                        }
                    } catch (e) { /* Not affordable yet */ }
                }
            }

            // Status report
            const prodStr = agDivInfo.productionMult ? agDivInfo.productionMult.toFixed(1) : '?';
            ns.print(`Corp: ${formatMoney(funds)} | Employees: ${totalEmployees}/3000 | Prod: ${prodStr}x/1000x | ` +
                `Rev: ${formatMoney(agDivInfo.lastCycleRevenue - agDivInfo.lastCycleExpenses)}/cycle`);
            ns.print(`Achievements: Corp:${achieved.corp ? 'Y' : 'N'} RE:${achieved.realEstate ? 'Y' : 'N'} ` +
                `Emp:${achieved.employees ? 'Y' : 'N'} Prod:${achieved.production ? 'Y' : 'N'} Lobby:${achieved.lobbying ? 'Y' : 'N'}`);

            // All done?
            if (Object.values(achieved).every(v => v)) {
                log(ns, `SUCCESS: All 5 corporation achievements unlocked! Script will continue running to maintain the corp.`, true, 'success');
            }
        } catch (err) {
            log(ns, `WARNING: corporation.js error (suppressed): ${err?.message || err}`, false, 'warning');
        }

        await ns.sleep(options.interval);
    }
}

/** Ensure a division exists, create it if not */
async function ensureDivision(ns, divName, industryType) {
    const corpInfo = await corp(ns, 'getCorporation()', 'info');
    if (!(corpInfo.divisions || []).includes(divName)) {
        await corp(ns, `expandIndustry(ns.args[0], ns.args[1])`, 'expand-ind', [industryType, divName]);
        log(ns, `Created ${industryType} division "${divName}".`);
    }
}

/** Expand a division to all 6 cities */
async function expandToAllCities(ns, divName) {
    const divInfo = await corp(ns, `getDivision(ns.args[0])`, 'div-cities', [divName]);
    for (const city of cities) {
        if (!(divInfo.cities || []).includes(city)) {
            try {
                await corp(ns, `expandCity(ns.args[0], ns.args[1])`, `expand-city-${city}`, [divName, city]);
                log(ns, `Expanded ${divName} to ${city}.`);
            } catch { /* May not have funds */ }
        }
    }
}

/** Hire employees to fill available slots and assign jobs */
async function hireAndAssignEmployees(ns, divName) {
    const divInfo = await corp(ns, `getDivision(ns.args[0])`, 'div-hire', [divName]);
    for (const city of divInfo.cities || []) {
        const office = await corp(ns, `getOffice(ns.args[0], ns.args[1])`, `office-hire-${city}`, [divName, city]);
        // Hire to fill empty slots
        for (let i = office.numEmployees; i < office.size; i++) {
            try {
                await corp(ns, `hireEmployee(ns.args[0], ns.args[1])`, `do-hire-${city}`, [divName, city]);
            } catch { break; }
        }
        await assignJobs(ns, divName, city);
    }
}

/** Assign employees to a balanced job distribution */
async function assignJobs(ns, divName, city) {
    const office = await corp(ns, `getOffice(ns.args[0], ns.args[1])`, `office-assign-${city}`, [divName, city]);
    const n = office.numEmployees;
    if (n === 0) return;

    // Balanced distribution: Operations, Engineer, Business, Management, R&D
    const ops = Math.max(1, Math.floor(n * 0.2));
    const eng = Math.max(1, Math.floor(n * 0.2));
    const bus = Math.max(1, Math.floor(n * 0.2));
    const mgmt = Math.max(1, Math.floor(n * 0.2));
    const rnd = n - ops - eng - bus - mgmt;

    const jobs = [
        ["Operations", ops], ["Engineer", eng], ["Business", bus],
        ["Management", mgmt], ["Research & Development", rnd]
    ];
    for (const [job, count] of jobs) {
        if (count > 0) {
            try {
                await corp(ns, `setAutoJobAssignment(ns.args[0], ns.args[1], ns.args[2], ${count})`, `job-${city}-${job}`, [divName, city, job]);
            } catch { /* Job assignment may fail if total doesn't match */ }
        }
    }
}

/** Set up warehouses and production selling for a division */
async function setupWarehousesAndProduction(ns, divName) {
    const divInfo = await corp(ns, `getDivision(ns.args[0])`, 'div-wh', [divName]);
    for (const city of divInfo.cities || []) {
        // Check if warehouse exists, if not purchase one
        try {
            await corp(ns, `getWarehouse(ns.args[0], ns.args[1])`, `wh-check-${city}`, [divName, city]);
        } catch {
            try {
                await corp(ns, `purchaseWarehouse(ns.args[0], ns.args[1])`, `wh-buy-${city}`, [divName, city]);
                log(ns, `Purchased warehouse in ${city} for ${divName}.`);
            } catch { continue; /* Can't afford */ }
        }

        // Enable smart supply if available
        try { await corp(ns, `setSmartSupply(ns.args[0], ns.args[1], true)`, `ss-${city}`, [divName, city]); }
        catch { /* Smart Supply unlock not purchased yet */ }

        // Sell all produced materials at market price
        try { await corp(ns, `sellMaterial(ns.args[0], ns.args[1], "Food", "MAX", "MP")`, `sell-food-${city}`, [divName, city]); } catch { }
        try { await corp(ns, `sellMaterial(ns.args[0], ns.args[1], "Plants", "MAX", "MP")`, `sell-plants-${city}`, [divName, city]); } catch { }
    }
}

/** Level up corporation upgrades to boost production */
async function levelUpgrades(ns, funds) {
    if (funds < 1e9) return; // Don't upgrade if low on funds

    // Priority upgrades for production multiplier
    const upgrades = ["Smart Factories", "Smart Storage", "DreamSense", "ABC SalesBots",
        "Wilson Analytics", "Nuoptimal Nootropic Injector Implants",
        "Speech Processor Implants", "Neural Accelerators", "FocusWires"];

    for (const upgrade of upgrades) {
        try {
            const cost = await corp(ns, `getUpgradeLevelCost(ns.args[0])`, `upg-cost-${upgrade}`, [upgrade]);
            if (cost < funds * 0.1) { // Only spend up to 10% of funds per upgrade
                await corp(ns, `levelUpgrade(ns.args[0])`, `upg-buy-${upgrade}`, [upgrade]);
            }
        } catch { /* Upgrade not available or too expensive */ }
    }

    // Also try to purchase Smart Supply unlock if not already owned
    try {
        const hasSS = await corp(ns, `hasUnlock("Smart Supply")`, 'has-ss');
        if (!hasSS) {
            const ssCost = await corp(ns, `getUnlockCost("Smart Supply")`, 'ss-cost');
            if (ssCost < funds * 0.3)
                await corp(ns, `purchaseUnlock("Smart Supply")`, 'buy-ss');
        }
    } catch { }
}

/** Accept investment offers to grow corporation funds */
async function maybeAcceptInvestment(ns, corpInfo) {
    // Only accept if corporation is still private
    if (corpInfo.public) return;

    try {
        const offer = await corp(ns, 'getInvestmentOffer()', 'invest-offer');
        if (offer && offer.funds > 0 && offer.round <= 4) {
            // Accept if the offer is significant relative to current funds
            if (offer.funds > corpInfo.funds * 0.5 || offer.round <= 2) {
                await corp(ns, 'acceptInvestmentOffer()', 'invest-accept');
                log(ns, `SUCCESS: Accepted investment round ${offer.round}: ${formatMoney(offer.funds)}`, true, 'success');
            }
        }
    } catch { /* No offer available or already public */ }
}
