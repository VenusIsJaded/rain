import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

let lastLogAt = 0;
const dlog = (...a: any[]) => {
    const now = Date.now();
    if (now - lastLogAt < 200) return;
    lastLogAt = now;
    try { logger.log("[reviewdb/simplified]", ...a); } catch {}
};

export default () => {
    const SimplifiedUserProfileContent = findByTypeName("SimplifiedUserProfileContent");

    if (!SimplifiedUserProfileContent) {
        logger.warn("[reviewdb/simplified] SimplifiedUserProfileContent not found — patch skipped.");
        return () => false;
    }

    logger.log("[reviewdb/simplified] patch installed");

    return after("type", SimplifiedUserProfileContent, (args, ret) => {
        const userId = args[0]?.user?.id;

        const sectionView = findInReactTree(
            ret,
            r => {
                if (r?.type?.displayName !== "View") return false;
                const c = r?.props?.children;
                if (!Array.isArray(c)) return false;
                return c.some((i: any) => {
                    const n = i?.type?.name;
                    return n === "SimplifiedUserProfileAboutMeCard"
                        || n === "UserProfileAboutMeCard"
                        || n === "UserProfileBio"
                        || (typeof n === "string" && (n.includes("AboutMe") || n.includes("Bio")));
                });
            },
        );
        const profileSections = sectionView?.props?.children;

        if (!userId || !Array.isArray(profileSections)) {
            dlog("bail userId=", userId, "sections?", Array.isArray(profileSections));
            return;
        }
        if (profileSections.some((c: any) => c?.type === ReviewSection)) {
            dlog("already injected for", userId);
            return;
        }

        profileSections.push(React.createElement(ReviewSection, { userId }));
        dlog("INJECTED for", userId);
    });
};
