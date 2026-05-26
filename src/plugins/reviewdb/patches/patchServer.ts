import { instead } from "@api/patcher";
import { findByName, findByProps } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";
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
        if (!Mod) Mod = findByName("GuildProfile", false);

        if (Mod) {
            logger.info(`[ReviewDB-Debug] Found GuildSheet after ${attempts} attempts! Keys:`, Object.keys(Mod));
            const funcName = Mod.default ? "default" : "type";
            
            unpatch = instead(funcName, Mod, (args, ret) => {
                logger.info("[ReviewDB-Debug] GuildSheet rendered!");
                const guildId = args[0]?.guild?.id;
                if (guildId) {
                    logger.info(`[ReviewDB-Debug] Injecting ReviewCard for guild ${guildId}`);
                    return React.createElement(ReviewCard, { userId: guildId });
                }
                return ret;
            });
            return true;
        }
        if (attempts % 5 === 0) logger.info(`[ReviewDB-Debug] Still searching for GuildSheet... (attempt ${attempts})`);
        return false;
    };

    if (!tryPatch()) {
        interval = setInterval(() => { if (tryPatch()) clearInterval(interval); }, 1000);
    }
    return () => { if (interval) clearInterval(interval); if (unpatch) unpatch(); };
};
