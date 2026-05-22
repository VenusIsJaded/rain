import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeNameLazy } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

// NOTE: findByTypeNameLazy returns a Proxy, never undefined, so the previous
// `SimplifiedUserProfileContent !== undefined ? after(...) : () => false`
// ternary always took the true branch. Simplified to a direct after() call.
const SimplifiedUserProfileContent = findByTypeNameLazy(
    "SimplifiedUserProfileContent",
);

export default () =>
    after("type", SimplifiedUserProfileContent, (args, ret) => {
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
