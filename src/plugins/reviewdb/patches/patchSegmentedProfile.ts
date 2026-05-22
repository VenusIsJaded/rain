import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

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
        if (!children) return;

        const childrenArray = Array.isArray(children) ? children : [children];

        for (let idx = 0; idx < childrenArray.length; idx++) {
            const page = childrenArray[idx]?.props?.item?.page;
            if (!page) continue;

            const sectionView = findInReactTree(page?.props?.children ?? page, sectionFilter);
            const profileSections = sectionView?.props?.children;
            if (!Array.isArray(profileSections)) continue;

            const userId = profileSections[profileSections.length - 1]?.props?.userId;
            if (!userId) continue;
            if (profileSections.some((c: any) => c?.type === ReviewSection)) continue;

            profileSections.push(React.createElement(ReviewSection, { userId }));
        }
    });
};
