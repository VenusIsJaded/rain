import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePathLazy } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

// NOTE: findByFilePathLazy returns a Proxy, never undefined, so the previous
// `SegmentedControlPages !== undefined ? after(...) : () => false`
// ternary always took the true branch. Simplified to a direct after() call.
// Also: React was used but not imported — ReferenceError crash on profileSections.push.
const SegmentedControlPages = findByFilePathLazy(
    "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
);

export default () =>
    after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
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

        // BUG FIX: React was used here but never imported — would cause ReferenceError.
        profileSections.push(React.createElement(ReviewSection, { userId }));
    });
