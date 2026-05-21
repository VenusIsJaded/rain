import { FluxDispatcher } from "@metro/common";
import React, { useEffect,useState } from "react";

const PresenceUpdatedContainer = ({ userId, children }: { userId: string, children: React.ReactNode }) => {
    const [counter, setCounter] = useState(0);
    useEffect(() => {

        const presenceUpdate = (event: any) => {
            if (!event || !event.updates) return;
            for (const update of event.updates) {
                if (update.user?.id === userId) {
                    setCounter(prevCounter => prevCounter + 1);
                    return;
                }
            }
        };
        FluxDispatcher.subscribe("PRESENCE_UPDATES",presenceUpdate);
        return () => {
            FluxDispatcher.unsubscribe("PRESENCE_UPDATES",presenceUpdate);
        };
    }, [userId]);

    return (
        React.Children.map(children, (child, index) => {
            return React.cloneElement(child as React.ReactElement, { key: `${index}-${counter}` });
        })
    );
};

export default PresenceUpdatedContainer;
