import { findAssetId } from "@api/assets";
import { IconButton } from "@metro/common/components";
// BUG FIX: React.ReactElement was referenced in the prop type below but React
// was never imported. In Metro, React is NOT a global — every file that uses
// React.* types or JSX must import it explicitly. Without this import React ===
// undefined at runtime, causing a TypeError on module evaluation.
import { React } from "@metro/common";

import { jumpToTop } from "../utils";
import { UpsideDown } from "./UpsideDown";

const commonProps = {
    variant: "secondary",
    icon: findAssetId("ArrowLargeDownIcon"),
} as const;

export function OldButtons({
    isNotCurrentChannel = false,
    details,
    JumpToPresentButton,
}: {
    isNotCurrentChannel: boolean;
    details: { guildId: string; channelId: string; };
    JumpToPresentButton: React.ReactElement<{ onPress: () => void; }>;
}) {
    const jumpToPresent = JumpToPresentButton.props?.onPress;

    return (
        <>
            <UpsideDown>
                <IconButton
                    onPress={jumpToTop(isNotCurrentChannel, details)}
                    {...commonProps}
                />
            </UpsideDown>
            <IconButton onPress={jumpToPresent} {...commonProps} />
        </>
    );
}
