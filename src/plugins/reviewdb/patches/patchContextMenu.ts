import { before } from "@api/patcher";
import { findByProps } from "@metro";

import { ActionSheet } from "../components/ActionSheet";
import ReviewActionSheet from "../components/ReviewActionSheet";

const ContextMenuPopout = findByProps("ContextMenuPopout");

export default () => {
    if (!ContextMenuPopout) {
        console.error("[ReviewDB] Failed to find ContextMenuPopout module! The context-menu patch will not inject.");
        return () => false;
    }

    return before("ContextMenuPopout", ContextMenuPopout, args => {
        const userId = args[0]?.menu?.key;
        if (
            userId !== undefined &&
            args[0]?.menu?.items?.length === 3 &&
            userId?.length >= 17
        ) {
            args[0].menu.items.push({
                label: "Reviews",
                action: () => {
                    ActionSheet.open(ReviewActionSheet, { userId });
                },
            });
        }
    });
};
