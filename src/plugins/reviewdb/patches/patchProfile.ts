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
    try { logger.log("[reviewdb/profile]", ...a); } catch {}
};

export default () => {
    const UserProfile =
        findByTypeName("UserProfile") ??
        findByTypeName("UserProfileContent");

    if (!UserProfile) {
        logger.warn("[reviewdb/profile] UserProfile/UserProfileContent not found — patch skipped.");
        return () => false;
    }

    logger.log("[reviewdb/profile] patch installed");

    return after("type", UserProfile, (args, ret) => {
        let userId = args[0]?.userId;
        if (userId === undefined) userId = args[0]?.user?.id;

        const sectionView = findInReactTree(
            ret,
            r => {
                if (r?.type?.displayName !== "View") return false;
                const c = r?.props?.children;
                if (!Array.isArray(c)) return false;
                return c.some((i: any) => {
                    const n = i?.type?.name;
                    return n === "UserProfileBio"
                        || n === "UserProfileAboutMeCard"
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
