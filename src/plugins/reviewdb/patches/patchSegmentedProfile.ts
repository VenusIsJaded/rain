import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

const log = (...a: any[]) => { try { logger.log("[reviewdb/seg]", ...a); } catch {} };

export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) return () => false;

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const profileSections = findInReactTree(
            ret?.props?.children?.[0]?.props?.item?.page?.props?.children,
            r =>
                r?.type?.displayName === "View" &&
                r?.props?.children?.findIndex(
                    (i: any) =>
                        i?.type?.name === "UserProfileBio" ||
                        i?.type?.name === "UserProfileAboutMeCard",
                ) !== -1,
        )?.props?.children;

        if (!Array.isArray(profileSections)) { log("no sections"); return; }

        const userId = profileSections[profileSections.length - 1]?.props?.userId;
        if (!userId) { log("no userId on last sibling"); return; }

        if (profileSections.some((c: any) => c?.type === ReviewSection)) {
            log("already injected for", userId);
            return;
        }

        profileSections.push(React.createElement(ReviewSection, { userId }));
        log("INJECTED userId=", userId, "(arr len now", profileSections.length, ")");
    });
};
