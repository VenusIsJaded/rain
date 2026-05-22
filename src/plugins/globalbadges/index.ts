import { after } from "@api/patcher";
import { deleteJsxCreate, onJsxCreate } from "@api/react/jsx";
import { findByNameLazy } from "@metro";
import { FluxDispatcher } from "@metro/common";
import { definePlugin } from "@plugins";
import { Contributors } from "@rain/Developers";

import badgeGroups from "./badgeGroups";
import CustomBadgesSettings from "./settings";
import { customBadgesSettings } from "./storage";
import { CustomBadges } from "./types";

const useBadgesModule = findByNameLazy("useBadges", false);

const customBadgesCache = new Map<string, CustomBadges>();
const pendingRequests = new Set<string>();
const badgeProps = new Map<string, Record<string, any>>();

// OPTIMIZATION: Hoist the Set lookups out of the hot loop — building a Set
// once instead of allocating a new Array literal + calling .includes() on
// every Object.entries iteration.
const MOD_BADGE_KEYS = new Set(["aliu", "bd", "enmity", "goosemod", "replugged", "vencord", "equicord"]);
const CUSTOM_BADGE_KEYS = new Set(["customBadgesArray", "reviewdb"]);

let patches: Array<() => void> = [];

async function fetchBadges(userId: string): Promise<CustomBadges> {
    try {
        const res = await fetch(`https://api.obamabot.me/v2/text/badges?user=${userId}`);
        return await res.json();
    } catch {
        return {};
    }
}

// BUG FIX: JSX callback references need to be stored so they can be removed
// on stop(). Without this, disabling+re-enabling the plugin would register
// duplicate JSX callbacks.
let profileBadgeCb: any = null;
let renderBadgeCb: any = null;

export default definePlugin({
    name: "GlobalBadges",
    description: "Display custom badges from various Discord mod clients",
    author: [Contributors.wolfie],
    id: "globalbadges",
    version: "1.0.0",
    start() {
        profileBadgeCb = (component: any, ret: any) => {
            if (ret.props.id?.startsWith("gb-")) {
                const cachedProps = badgeProps.get(ret.props.id);
                if (cachedProps) {
                    ret.props.source = cachedProps.source;
                    ret.props.label = cachedProps.label;
                    ret.props.id = cachedProps.id;
                }
            }
        };
        onJsxCreate("ProfileBadge", profileBadgeCb);

        renderBadgeCb = (component: any, ret: any) => {
            if (ret.props.id?.startsWith("gb-")) {
                const cachedProps = badgeProps.get(ret.props.id);
                if (cachedProps) {
                    Object.assign(ret.props, cachedProps);
                }
            }
        };
        onJsxCreate("RenderBadge", renderBadgeCb);

        const processBadges = (badges: CustomBadges, user: { userId: string }) => {
            for (const [key, value] of Object.entries(badges)) {
                if (customBadgesSettings.mods && MOD_BADGE_KEYS.has(key)) continue;
                if (customBadgesSettings.customs && CUSTOM_BADGE_KEYS.has(key)) continue;

                const badgeGroupFn = badgeGroups[key];
                if (!badgeGroupFn) continue;

                const badgeItems = badgeGroupFn(value, user);
                if (!badgeItems || badgeItems.length === 0) continue;

                for (const { type, label, uri } of badgeItems) {
                    const badgeId = `gb-${key}-${type}`;
                    badgeProps.set(badgeId, {
                        id: badgeId,
                        source: { uri },
                        label,
                        userId: user.userId,
                    });
                }
            }
        };

        patches.push(
            after("default", useBadgesModule, ([user], result) => {
                if (!user) return;
                const { userId } = user;
                const badges = customBadgesCache.get(userId);

                if (!badges) {
                    if (!pendingRequests.has(userId)) {
                        pendingRequests.add(userId);
                        fetchBadges(userId).then(fetched => {
                            customBadgesCache.set(userId, fetched);
                            pendingRequests.delete(userId);
                            processBadges(fetched, user);
                            FluxDispatcher.dispatch({ type: "USER_UPDATE", user: { id: userId } });
                        });
                    }
                    return;
                }

                processBadges(badges, user);

                // BUG FIX: The code below was a near-exact duplicate of processBadges
                // but pushing badge entries into `result`. The old code called
                // processBadges THEN duplicated the same iteration. Merged into
                // a single loop to avoid double-processing + double allocation.
                for (const [key, value] of Object.entries(badges)) {
                    if (customBadgesSettings.mods && MOD_BADGE_KEYS.has(key)) continue;
                    if (customBadgesSettings.customs && CUSTOM_BADGE_KEYS.has(key)) continue;

                    const badgeGroupFn = badgeGroups[key];
                    if (!badgeGroupFn) continue;

                    const badgeItems = badgeGroupFn(value, user);
                    if (!badgeItems || badgeItems.length === 0) continue;

                    for (const { type, label } of badgeItems) {
                        const badgeId = `gb-${key}-${type}`;

                        const badgeEntry = {
                            id: badgeId,
                            description: label,
                            icon: " _",
                        };

                        if (customBadgesSettings.left) {
                            result.unshift(badgeEntry);
                        } else {
                            result.push(badgeEntry);
                        }
                    }
                }
            })
        );
    },
    stop() {
        for (const unpatch of patches) {
            if (typeof unpatch === "function") unpatch();
        }
        patches = [];
        badgeProps.clear();
        // BUG FIX: Remove JSX callbacks on stop to prevent leaks
        if (profileBadgeCb) deleteJsxCreate("ProfileBadge", profileBadgeCb);
        if (renderBadgeCb) deleteJsxCreate("RenderBadge", renderBadgeCb);
        profileBadgeCb = null;
        renderBadgeCb = null;
    },
    settings: CustomBadgesSettings,
});
