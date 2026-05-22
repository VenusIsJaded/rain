import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

// BUG FIX — same class of failure as patchProfile.ts:
// findByTypeNameLazy's forceLoad() throws when the module is absent,
// crashing the plugin with "type is not a function in Object" or
// "SimplifiedUserProfileContent is undefined! (id unknown)".
//
// Fix: use the synchronous (non-throwing) findByTypeName and guard
// explicitly. If the module isn't found we skip the patch gracefully.
export default () => {
    const SimplifiedUserProfileContent = findByTypeName("SimplifiedUserProfileContent");

    if (!SimplifiedUserProfileContent) {
        if (__DEV__) {
            console.warn(
                "[reviewdb/patchSimplifiedProfile] SimplifiedUserProfileContent " +
                "not found in Metro — skipping simplified profile patch.",
            );
        }
        return () => false;
    }

    return after("type", SimplifiedUserProfileContent, (args, ret) => {
        const profileSections = findInReactTree(
            ret,
            r =>
                r?.type?.displayName === "View" &&
                r?.props?.children.findIndex(
                    (i: any) =>
                        i?.type?.name ===
                        "SimplifiedUserProfileAboutMeCard",
                ) !== -1,
        )?.props?.children;

        const userId = args[0]?.user?.id;

        // Guard against missing userId/sections + duplicate injection
        if (!userId || !profileSections) return;
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        profileSections.push(
            React.createElement(ReviewSection, { userId }),
        );
    });
};
