import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

const log = (...a: any[]) => { try { logger.log("[reviewdb/seg]", ...a); } catch {} };

const sectionFilter = (r: any) =>
    r?.type?.displayName === "View" &&
    Array.isArray(r?.props?.children) &&
    r.props.children.findIndex(
        (i: any) =>
            i?.type?.name === "UserProfileBio" ||
            i?.type?.name === "UserProfileAboutMeCard",
    ) !== -1;

export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) return () => false;

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const children = ret?.props?.children;
        if (!children) { log("FIRE no ret.children"); return; }

        const childrenArray = Array.isArray(children) ? children : [children];
        log("FIRE pages=", childrenArray.length);

        // Search EVERY page, not just children[0]. The official only checks
        // children[0] but on this Discord build the profile sections may live
        // in a different page index.
        for (let idx = 0; idx < childrenArray.length; idx++) {
            const page = childrenArray[idx]?.props?.item?.page;
            if (!page) { log("idx", idx, "no page"); continue; }

            const sectionView = findInReactTree(page?.props?.children ?? page, sectionFilter);
            const profileSections = sectionView?.props?.children;

            if (!Array.isArray(profileSections)) {
                log("idx", idx, "no section view");
                continue;
            }

            const userId = profileSections[profileSections.length - 1]?.props?.userId;
            if (!userId) { log("idx", idx, "found sections but no userId on last"); continue; }

            if (profileSections.some((c: any) => c?.type === ReviewSection)) {
                log("idx", idx, "already injected for", userId);
                continue;
            }

            profileSections.push(React.createElement(ReviewSection, { userId }));
            log("idx", idx, "INJECTED userId=", userId);
        }
    });
};
