import { instead } from "@api/patcher";
import { findByName, findByProps } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";
import { metroModules, requireModule } from "@metro/internals/modules";
import ReviewCard from "../components/ReviewCard";

export default () => {
    logger.info("[ReviewDB-Debug] patchServer initialized");
    let unpatch: (() => void) | null = null;
    let interval: any = null;
    let attempts = 0;

    const tryPatch = () => {
        attempts++;
        let Mod = findByName("GuildActionSheetProgress", false);
        if (!Mod) Mod = findByName("GuildActionSheet", false);
        if (!Mod) Mod = findByProps("GuildActionSheet");

        if (Mod) {
            logger.info(`[ReviewDB-Debug] Found GuildSheet after ${attempts} attempts!`);
            const funcName = Mod.default ? "default" : "type";
            unpatch = instead(funcName, Mod, (args, ret) => {
                const guildId = args[0]?.guild?.id;
                if (guildId) return React.createElement(ReviewCard, { userId: guildId });
                return ret;
            });
            return true;
        }

        if (attempts === 5) {
            logger.info("[ReviewDB-Debug] Dumping all modules to find Guild Sheet...");
            const keys = Object.keys(metroModules);
            const found = [];
            for (let i = 0; i < keys.length; i++) {
                const id = Number(keys[i]);
                try {
                    const mod = requireModule(id);
                    if (!mod) continue;
                    if (mod.default) {
                        const name = mod.default.name || mod.default.displayName;
                        if (name && (name.toLowerCase().includes("guild") || name.toLowerCase().includes("sheet"))) found.push(`default:${name}`);
                    }
                    for (const key of Object.keys(mod)) {
                        if (key === "default") continue;
                        const exp = mod[key];
                        if (exp && typeof exp === "function") {
                            const name = exp.name || exp.displayName;
                            if (name && (name.toLowerCase().includes("guild") || name.toLowerCase().includes("sheet"))) found.push(`${key}:${name}`);
                        }
                    }
                } catch {}
            }
            logger.info("[ReviewDB-Debug] Found Guild/Sheet modules:", found.join(", "));
        }
        return false;
    };

    if (!tryPatch()) interval = setInterval(() => { if (tryPatch()) clearInterval(interval); }, 1000);
    return () => { if (interval) clearInterval(interval); if (unpatch) unpatch(); };
};
