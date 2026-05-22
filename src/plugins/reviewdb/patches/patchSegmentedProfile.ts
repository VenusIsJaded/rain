import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) return () => false;

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        // Official's exact walk: ret.props.children[0].props.item.page.props.children
        // Don't search anywhere else — that's how the wishlist-experiment fix works.
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

        // Official's userId source — last sibling component's props.userId.
        // This is the wishlist-experiment fix (codeberg commit 103bf82).
        const userId = profileSections[profileSections.length - 1]?.props?.userId;
        if (!userId) return;

        // Idempotency guard — segmented hook fires on every re-render.
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        profileSections.push(React.createElement(ReviewSection, { userId }));
    });
};
