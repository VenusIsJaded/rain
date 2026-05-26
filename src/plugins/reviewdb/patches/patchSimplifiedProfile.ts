import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByName, findByTypeName } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";
import { metroModules, requireModule } from "@metro/internals/modules";
import ReviewSection from "../components/ReviewSection";

export default () => {
    logger.info("[ReviewDB-Debug] patchSimplifiedProfile initialized");
    let unpatch: (() => void) | null = null;
    let interval: any = null;
    let attempts = 0;

    const tryPatch = () => {
        attempts++;
        let Mod = findByTypeName("SimplifiedUserProfileContent");
        if (!Mod) Mod = findByName("SimplifiedUserProfileContent", false);
        if (!Mod) Mod = findByName("SimplifiedUserProfilePanel", false);

        if (Mod) {
            logger.info(`[ReviewDB-Debug] Found SimplifiedProfile after ${attempts} attempts!`);
            const funcName = Mod.type ? "type" : "default";
            unpatch = after(funcName, Mod, (args, ret) => {
                const profileSections = findInReactTree(ret, r => r?.type?.displayName === "View" && r?.props?.children.findIndex((i: any) => i?.type?.name === "SimplifiedUserProfileAboutMeCard") !== -1)?.props?.children;
                if (profileSections) {
                    const userId = args[0]?.user?.id;
                    if (userId) profileSections?.push(React.createElement(ReviewSection, { userId }));
                }
            });
            return true;
        }

        if (attempts === 5) {
            logger.info("[ReviewDB-Debug] Dumping all modules to find Simplified Profile...");
            const keys = Object.keys(metroModules);
            const found = [];
            for (let i = 0; i < keys.length; i++) {
                const id = Number(keys[i]);
                try {
                    const mod = requireModule(id);
                    if (!mod) continue;
                    if (mod.default) {
                        const name = mod.default.name || mod.default.displayName || mod.default.type?.name || mod.default.type?.displayName;
                        if (name && name.toLowerCase().includes("profile")) found.push(`default:${name}`);
                    }
                    for (const key of Object.keys(mod)) {
                        if (key === "default") continue;
                        const exp = mod[key];
                        if (exp && typeof exp === "function") {
                            const name = exp.name || exp.displayName || exp.type?.name || exp.type?.displayName;
                            if (name && name.toLowerCase().includes("profile")) found.push(`${key}:${name}`);
                        }
                    }
                } catch {}
            }
            logger.info("[ReviewDB-Debug] Found Profile modules:", found.join(", "));
        }
        return false;
    };

    if (!tryPatch()) interval = setInterval(() => { if (tryPatch()) clearInterval(interval); }, 1000);
    return () => { if (interval) clearInterval(interval); if (unpatch) unpatch(); };
};
