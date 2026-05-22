import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

// Diagnostic logger — throttled to one entry per 500ms to keep Debug Logs readable.
let lastLog = 0;
const dlog = (...a: any[]) => {
    const now = Date.now();
    if (now - lastLog < 500) return;
    lastLog = now;
    try { logger.log("[reviewdb/seg]", ...a); } catch {}
};

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

        if (!Array.isArray(profileSections)) return;

        // Dump every section component + any userId/user.id it carries on its props.
        // This is the ONE thing we need to see to fix this for real.
        const dump = profileSections.map((c: any, i: number) => ({
            i,
            name: c?.type?.name ?? c?.type?.displayName ?? "?",
            userId: c?.props?.userId ?? null,
            userDotId: c?.props?.user?.id ?? null,
        }));
        dlog("section dump:", JSON.stringify(dump));

        const userId = profileSections[profileSections.length - 1]?.props?.userId;
        if (!userId) { dlog("no userId on last sibling"); return; }
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        profileSections.push(React.createElement(ReviewSection, { userId }));
        dlog("injected userId=", userId);
    });
};
