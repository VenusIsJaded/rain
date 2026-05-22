import { before } from "@api/patcher";
import { findByPropsLazy } from "@metro";

import { ActionSheet } from "../components/ActionSheet";
import ReviewActionSheet from "../components/ReviewActionSheet";

const ContextMenuPopout = findByPropsLazy("ContextMenuPopout");

export default () =>
    before("ContextMenuPopout", ContextMenuPopout, args => {
        const userId = args[0]?.menu?.key;
        if (
            userId !== undefined &&
            args[0]?.menu?.items?.length === 3 &&
            userId?.length >= 17
        ) {
            // BUG FIX: Check if a "Reviews" item already exists before pushing.
            // Without this, opening the context menu multiple times would
            // duplicate the "Reviews" entry each time.
            const alreadyHasReviews = args[0].menu.items.some(
                (item: any) => item.label === "Reviews"
            );
            if (alreadyHasReviews) return;

            args[0].menu.items.push({
                label: "Reviews",
                action: () => {
                    ActionSheet.open(ReviewActionSheet, { userId });
                },
            });
        }
    });
