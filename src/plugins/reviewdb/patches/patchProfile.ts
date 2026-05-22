import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { proxyLazy } from "@lib/utils/lazy";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

// BUG FIX (round 2 — "Trying to Reflect.get of undefined"):
// The previous proxyLazy factory called findByTypeName("UserProfile") ??
// findByTypeName("UserProfileContent"), which is correct — BUT if BOTH
// return undefined (e.g. neither module is present yet at resolution time),
// proxyLazy receives `undefined` from the factory and then every Reflect trap
// throws "Trying to Reflect.get of undefined".
//
// Fix: return a stable sentinel object when both lookups fail so proxyLazy
// always has a non-null resolved value. The `after` patch below will simply
// not fire because its target method ("type") won't exist on the sentinel,
// which is safe. Also guard the `after` call itself so it only patches when
// a real component was resolved.
const _sentinelNoOp = Object.freeze({});

const UserProfile = proxyLazy(
    () =>
        findByTypeName("UserProfile") ??
        findByTypeName("UserProfileContent") ??
        (_sentinelNoOp as any),
    { hint: "object" },
);

export default () => {
    // If resolution yielded the sentinel (neither component found), skip patching
    // gracefully instead of crashing the entire plugin.
    if (UserProfile === _sentinelNoOp) return () => false;

    return after("type", UserProfile, (args, ret) => {
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
};
