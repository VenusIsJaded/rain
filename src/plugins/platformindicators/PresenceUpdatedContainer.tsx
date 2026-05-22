import { FluxDispatcher } from "@metro/common";
import React, { useCallback, useEffect, useReducer } from "react";

// OPTIMIZATION + BUG FIX: The original implementation used React.cloneElement
// + React.Children.map to inject a changing `key` prop on every PRESENCE_UPDATE,
// which forces React to completely unmount and remount all children — expensive.
// Replaced with useReducer(c => c + 1) which triggers a normal re-render
// (not a remount) of children. The event handler is also now stable via
// useCallback so it doesn't re-subscribe on every render.
const PresenceUpdatedContainer = ({ userId, children }: { userId: string; children: React.ReactNode }) => {
    const [, forceUpdate] = useReducer((c: number) => c + 1, 0);

    const presenceUpdate = useCallback((event: any) => {
        if (!event?.updates) return;
        for (const update of event.updates) {
            if (update.user?.id === userId) {
                forceUpdate();
                return;
            }
        }
    }, [userId]);

    useEffect(() => {
        FluxDispatcher.subscribe("PRESENCE_UPDATES", presenceUpdate);
        return () => {
            FluxDispatcher.unsubscribe("PRESENCE_UPDATES", presenceUpdate);
        };
    }, [presenceUpdate]);

    return <>{children}</>;
};

export default PresenceUpdatedContainer;
