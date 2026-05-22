import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { proxyLazy } from "@lib/utils/lazy";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

// BUG FIX: The previous code used findByTypeNameLazy("UserProfile") and then
// checked `if (UserProfile === undefined)` to fall back to "UserProfileContent".
// That check NEVER fires because findByTypeNameLazy always returns a Proxy
// object — never undefined. So the fallback was dead code, and when Discord's
// bundle only has "UserProfileContent" (not "UserProfile"), forceLoad() would
// throw: "rain.metro.byTypeName(UserProfile) is undefined!"
//
// Fix: use proxyLazy with a factory that tries both names at resolution time,
// falling back from "UserProfile" → "UserProfileContent". This way the
// multi-name fallback actually runs when the proxy is first accessed.
const UserProfile = proxyLazy(
    () => findByTypeName("UserProfile") ?? findByTypeName("UserProfileContent"),
    { hint: "object" },
);

export default () =>
    after("type", UserProfile, (args, ret) => {
        const profileSections = findInReactTree(
            ret,
            r =>
                r?.type?.displayName === "View" &&
                // UserProfileBio still exists even when the user has no bio. Yep.
                r?.props?.children.findIndex(
                    (i: any) =>
                        i?.type?.name === "UserProfileBio" ||
                        i?.type?.name === "UserProfileAboutMeCard",
                ) !== -1,
        )?.props?.children;

        let userId = args[0]?.userId;
        if (userId === undefined) userId = args[0]?.user?.id;

        // Guard against undefined userId AND duplicate injection.
        // Without the duplication check, navigating back to a profile could
        // stack multiple ReviewSection elements.
        if (!userId || !profileSections) return;
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        profileSections.push(React.createElement(ReviewSection, { userId }));
    });
