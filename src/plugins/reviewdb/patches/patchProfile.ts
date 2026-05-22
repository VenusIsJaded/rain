import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

// BUG FIX — "UserProfile is undefined" / "type is not a function in Object":
//
// History of failures:
//   v1: used findByTypeName eagerly — threw if module missing at startup.
//   v2: used proxyLazy + sentinel — sentinel identity check never matched
//       (UserProfile is always a Proxy, never === _sentinelNoOp), so `after`
//       was always called; when forceLoad() threw, the plugin crashed with
//       "rain.metro.byTypeName(UserProfile) is undefined! (id unknown)".
//   v3: used findByTypeNameLazy alone — same forceLoad() throw.
//
// Root cause: findByTypeNameLazy's internal forceLoad() throws a hard Error
// when the module isn't found, and this error surfaces as either:
//   "rain.metro.byTypeName(UserProfile) is undefined! (id unknown)"   OR
//   "type is not a function in Object"
//   (the latter when `after` resolves the lazy and then tries to patch
//    `.type` on the still-undefined resolved value)
//
// Fix: eagerly attempt both module names with the synchronous (non-throwing)
// findByTypeName. If neither is present, return a no-op unpatcher immediately
// so the plugin starts successfully and other patches still apply. If one is
// found, hand it to `after` as a plain (non-lazy) object to avoid the
// forceLoad() throw path entirely.

export default () => {
    // Try the two known component names synchronously. These return undefined
    // (not throw) when the module is absent.
    const UserProfile =
        findByTypeName("UserProfile") ??
        findByTypeName("UserProfileContent");

    if (!UserProfile) {
        // Module not present in this Discord version — skip gracefully.
        if (true) {
            console.warn(
                "[reviewdb/patchProfile] Neither UserProfile nor UserProfileContent " +
                "found in Metro — skipping profile patch.",
            );
        }
        return () => false;
    }

    return after("type", UserProfile, (args, ret) => {
        const profileSections = findInReactTree(
            ret,
            r =>
                r?.type?.displayName === "View" &&
                r?.props?.children.findIndex(
                    (i: any) =>
                        i?.type?.name === "UserProfileBio" ||
                        i?.type?.name === "UserProfileAboutMeCard",
                ) !== -1,
        )?.props?.children;

        let userId = args[0]?.userId;
        if (userId === undefined) userId = args[0]?.user?.id;

        // Guard against undefined userId AND duplicate injection.
        if (!userId || !profileSections) return;
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        profileSections.push(React.createElement(ReviewSection, { userId }));
    });
};
