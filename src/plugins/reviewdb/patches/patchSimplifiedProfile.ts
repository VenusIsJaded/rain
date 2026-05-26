import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByName, findByTypeName } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";
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
        if (!Mod) Mod = findByName("SimplifiedUserProfilePanel", false); // Fallback from hidecallbuttons

        if (Mod) {
            logger.info(`[ReviewDB-Debug] Found SimplifiedProfile after ${attempts} attempts! Keys:`, Object.keys(Mod));
            const funcName = Mod.type ? "type" : "default";
            
            unpatch = after(funcName, Mod, (args, ret) => {
                logger.info("[ReviewDB-Debug] SimplifiedProfile rendered!");
                const profileSections = findInReactTree(
                    ret,
                    r => r?.type?.displayName === "View" && r?.props?.children.findIndex((i: any) => i?.type?.name === "SimplifiedUserProfileAboutMeCard") !== -1,
                )?.props?.children;

                if (profileSections) {
                    const userId = args[0]?.user?.id;
                    if (userId) {
                        logger.info(`[ReviewDB-Debug] Injecting Simplified ReviewSection for user ${userId}`);
                        profileSections?.push(React.createElement(ReviewSection, { userId }));
                    }
                } else {
                    logger.warn("[ReviewDB-Debug] Could not find SimplifiedUserProfileAboutMeCard anchor!");
                }
            });
            return true;
        }
        if (attempts % 5 === 0) logger.info(`[ReviewDB-Debug] Still searching for SimplifiedProfile... (attempt ${attempts})`);
        return false;
    };

    if (!tryPatch()) {
        interval = setInterval(() => { if (tryPatch()) clearInterval(interval); }, 1000);
    }
    return () => { if (interval) clearInterval(interval); if (unpatch) unpatch(); };
};
