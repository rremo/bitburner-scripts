// This script exists solely to trigger the SCRIPT_32GB Steam achievement.
// It references enough expensive NS APIs to exceed 32GB RAM cost.
// You do NOT need to run it - just having it on home is enough.
/** @param {NS} ns */
export async function main(ns) {
    ns.corporation.getCorporation();
    ns.bladeburner.getCurrentAction();
    ns.gang.getGangInformation();
    ns.grafting.getGraftableAugmentations();
    ns.stanek.activeFragments();
    ns.singularity.getOwnedAugmentations();
    ns.sleeve.getNumSleeves();
    ns.hacknet.getHashUpgrades();
}
