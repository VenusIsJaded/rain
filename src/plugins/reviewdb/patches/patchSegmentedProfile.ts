import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByName, findByProps, findByFilePath } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";
import ReviewSection from "../components/ReviewSection";

export default () => {
    logger.info("[ReviewDB-Debug] patchSegmentedProfile initialized");
    let unpatch: (() => void) | null = null;
    let interval: any = null;
    let attempts = 0;

    const tryPatch = () => {
        attempts++;
        let Mod = findByFilePath("design/components/SegmentedControl/native/SegmentedControlPages.native.tsx");
        if (!Mod) Mod = findByName("SegmentedControlPages", false);
        if (!Mod) Mod = findByProps("SegmentedControlPages");

        if (Mod) {
            logger.info(`[ReviewDB-Debug] Found SegmentedControlPages after ${attempts} attempts! Keys:`, Object.keys(Mod));
            const funcName = Mod.SegmentedControlPages ? "SegmentedControlPages" : (Mod.type ? "type" : "default");
            logger.info(`[ReviewDB-Debug] Patching function: ${funcName}`);
            
            unpatch = after(funcName, Mod, (args, ret) => {
                logger.info("[ReviewDB-Debug] SegmentedControlPages rendered!");
                const profileSections = findInReactTree(
                    ret?.props?.children[0]?.props?.item?.page?.props?.children,
                    r => r?.type?.displayName === "View" && r?.props?.children.findIndex((i: any) => i?.type?.name === "UserProfileBio" || i?.type?.name === "UserProfileAboutMeCard") !== -1,
                )?.props?.children;
                
                if (profileSections) {
                    logger.info("[ReviewDB-Debug] Found profileSections anchor!", profileSections.length);
                    const userId = profileSections?.[profileSections?.length - 1]?.props?.userId;
                    if (userId) {
                        logger.info(`[ReviewDB-Debug] Injecting ReviewSection for user ${userId}`);
                        profileSections?.push(React.createElement(ReviewSection, { userId }));
                    } else {
                        logger.warn("[ReviewDB-Debug] Found profileSections but no userId at the end!");
                    }
                } else {
                    logger.warn("[ReviewDB-Debug] Could not find profileSections anchor in SegmentedControlPages!");
                }
            });
            return true;
        }
        if (attempts % 5 === 0) logger.info(`[ReviewDB-Debug] Still searching for SegmentedControlPages... (attempt ${attempts})`);
        return false;
    };

    if (!tryPatch()) {
        interval = setInterval(() => { if (tryPatch()) clearInterval(interval); }, 1000);
    }
    return () => { if (interval) clearInterval(interval); if (unpatch) unpatch(); };
};
