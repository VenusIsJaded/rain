// TEMPORARY PROBE — logs every action-sheet key, every modal key, and
// every navigation push so we can find out *how* other users' profiles
// are opened on this Discord build (since UserProfile/UserProfileContent/
// SimplifiedUserProfileContent are all missing).

import { before } from "@api/patcher";
import { findByPropsLazy } from "@metro";
import { logger } from "@lib/utils/logger";

const log = (...a: any[]) => { try { logger.log("[reviewdb/probe]", ...a); } catch {} };

export default () => {
    const unpatches: (() => boolean)[] = [];

    // Action sheets
    try {
        const LazyActionSheet = findByPropsLazy("openLazy", "hideActionSheet");
        unpatches.push(before("openLazy", LazyActionSheet, (args) => {
            const [, key, props] = args;
            log("openLazy key=", key,
                "userId?", props?.userId ?? props?.user?.id ?? null,
                "propKeys=", props ? Object.keys(props).slice(0, 15) : null);
        }));
        log("probe: openLazy hooked");
    } catch (e) { log("probe: openLazy hook failed", String(e)); }

    // Modals
    try {
        const modals = findByPropsLazy("pushModal", "popModal");
        unpatches.push(before("pushModal", modals, (args) => {
            const m = args?.[0];
            log("pushModal key=", m?.key,
                "componentName=", m?.modal?.name ?? m?.modal?.displayName,
                "userId?", m?.props?.userId ?? m?.props?.user?.id ?? null,
                "propKeys=", m?.props ? Object.keys(m.props).slice(0, 15) : null);
        }));
        log("probe: pushModal hooked");
    } catch (e) { log("probe: pushModal hook failed", String(e)); }

    // Navigation push / pushLazy
    try {
        const navigation = findByPropsLazy("pushLazy");
        unpatches.push(before("pushLazy", navigation, (args) => {
            const [screen, props] = args;
            log("nav.pushLazy screen=", typeof screen === "function" ? (screen.name || "<fn>") : screen,
                "userId?", props?.userId ?? props?.user?.id ?? null,
                "propKeys=", props ? Object.keys(props).slice(0, 15) : null);
        }));
        log("probe: nav.pushLazy hooked");
    } catch (e) { log("probe: pushLazy hook failed", String(e)); }

    // Generic navigation.push if present
    try {
        const navigation: any = findByPropsLazy("pushLazy");
        if (typeof navigation?.push === "function") {
            unpatches.push(before("push", navigation, (args) => {
                const [screen, props] = args;
                log("nav.push screen=", screen,
                    "userId?", props?.userId ?? props?.user?.id ?? null,
                    "propKeys=", props ? Object.keys(props).slice(0, 15) : null);
            }));
            log("probe: nav.push hooked");
        }
    } catch (e) { log("probe: nav.push hook failed", String(e)); }

    // showSimpleActionSheet
    try {
        const sas = findByPropsLazy("showSimpleActionSheet");
        unpatches.push(before("showSimpleActionSheet", sas, (args) => {
            const a = args?.[0];
            log("showSimpleActionSheet key=", a?.key,
                "title=", a?.header?.title,
                "userId?", a?.userId ?? a?.user?.id ?? null);
        }));
        log("probe: showSimpleActionSheet hooked");
    } catch (e) { log("probe: showSimpleActionSheet hook failed", String(e)); }

    return () => {
        let ok = true;
        for (const u of unpatches) ok = u() && ok;
        return ok;
    };
};
