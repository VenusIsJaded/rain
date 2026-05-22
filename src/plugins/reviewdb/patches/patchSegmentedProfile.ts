import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

// BUG FIX — same class of failure as patchProfile.ts / patchSimplifiedProfile.ts:
// findByFilePathLazy's internal forceLoad() throws when the module isn't in the
// bundle, crashing the plugin startup. Use the synchronous (non-throwing)
// findByFilePath and return a no-op unpatcher when the module is absent.
export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) {
        if (true) {
            console.warn(
                "[reviewdb/patchSegmentedProfile] SegmentedControlPages not found " +
                "in Metro — skipping segmented profile patch.",
            );
        }
        return () => false;
    }

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const profileSections = findInReactTree(
            ret?.props?.children[0]?.props?.item?.page?.props?.children,
            r =>
                r?.type?.displayName === "View" &&
                // UserProfileBio still exists even when the user has no bio. Yep.
                r?.props?.children.findIndex(
                    (i: any) =>
                        i?.type?.name === "UserProfileBio" ||
                        i?.type?.name === "UserProfileAboutMeCard",
                ) !== -1,
        )?.props?.children;

        // Guard against missing profileSections and duplicate injection
        if (!profileSections) return;
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        const userId = profileSections[profileSections.length - 1]?.props?.userId;
        if (!userId) return;

        profileSections.push(React.createElement(ReviewSection, { userId }));
    });
};
