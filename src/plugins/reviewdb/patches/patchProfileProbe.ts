// TEMPORARY PROBE — logs every action-sheet key opened and every
// component name rendered by ActionSheet/Modal so we can identify which
// component is used to render OTHER users' profiles when UserProfile,
// UserProfileContent, and SimplifiedUserProfileContent are all absent.

import { before } from "@api/patcher";
import { findByPropsLazy } from "@metro";
import { logger } from "@lib/utils/logger";

const log = (...a: any[]) => { try { logger.log("[reviewdb/probe]", ...a); } catch {} };

export default () => {
    const unpatches: (() => boolean)[] = [];

    try {
        const LazyActionSheet = findByPropsLazy("openLazy", "hideActionSheet");
        const u1 = before("openLazy", LazyActionSheet, (args) => {
            const [, key, props] = args;
            log("openLazy key=", key,
                "propKeys=", props ? Object.keys(props).slice(0, 15) : null,
                "userId?", props?.userId ?? props?.user?.id ?? null);
        });
        unpatches.push(u1);
        log("probe installed on openLazy");
    } catch (e) {
        log("openLazy probe failed", String(e));
    }

    try {
        const modals = findByPropsLazy("pushModal", "popModal");
        const u2 = before("pushModal", modals, (args) => {
            const m = args?.[0];
            log("pushModal key=", m?.key,
                "componentName=", m?.modal?.name ?? m?.modal?.displayName,
                "propKeys=", m?.props ? Object.keys(m.props).slice(0, 15) : null);
        });
        unpatches.push(u2);
        log("probe installed on pushModal");
    } catch (e) {
        log("pushModal probe failed", String(e));
    }

    return () => {
        let ok = true;
        for (const u of unpatches) ok = u() && ok;
        return ok;
    };
};
