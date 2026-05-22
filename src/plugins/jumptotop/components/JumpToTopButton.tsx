// BUG FIX: React.cloneElement was called at runtime but React was never
// imported. In Metro, React is NOT a global. Without this import,
// React.cloneElement throws a TypeError at render time.
import { React } from "@metro/common";
import { jumpToTop } from "../utils";
import { UpsideDown } from "./UpsideDown";

export default function JumpToTopButton({
    isNotCurrentChannel = false,
    details,
    JumpToPresentButton,
}: {
    isNotCurrentChannel: boolean;
    details: { guildId: string; channelId: string; };
    JumpToPresentButton: React.ReactElement<{ onPress: () => void; }>;
}) {
    return (
        // Theres no arrow up icon so we flip the arrow down one.
        <UpsideDown>
            {React.cloneElement(JumpToPresentButton, {
                ...JumpToPresentButton.props,
                onPress: jumpToTop(isNotCurrentChannel, details),
            })}
        </UpsideDown>
    );
}
