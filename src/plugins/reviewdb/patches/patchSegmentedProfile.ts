import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

const SegmentedControlPages = findByFilePath("design/components/SegmentedControl/native/SegmentedControlPages.native.tsx");

export default () => {
    if (!SegmentedControlPages) return () => {};

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const profileSections = findInReactTree(
            ret?.props?.children[0]?.props?.item?.page?.props?.children,
            r =>
                r?.type?.displayName === "View" &&
                r?.props?.children.findIndex(
                    (i: any) =>
                        i?.type?.name === "UserProfileBio" ||
                        i?.type?.name === "UserProfileAboutMeCard"
                ) !== -1,
        )?.props?.children;
        const userId = profileSections?.[profileSections?.length - 1]?.props?.userId;

        profileSections?.push(React.createElement(ReviewSection, { userId }));
    });
};
