import React, { useEffect, useReducer } from "react";

// PERF FIX: The original RerenderContainer used React.cloneElement +
// React.Children.map to inject a new `key` prop every 2 seconds. Changing
// a component's `key` forces React to fully UNMOUNT and REMOUNT the child —
// it destroys all component state, re-fires every effect, and re-runs all
// layout, which is extremely expensive (similar cost to removing and adding
// a DOM node). This was only needed to force a re-render, which can be done
// far more cheaply with useReducer.
//
// Fix: useReducer(c => c + 1) triggers a standard lightweight re-render of
// the children without destroying/recreating them. Children retain their
// state and effects are not re-fired.
const RerenderContainer = ({ children }: { children: React.ReactNode }) => {
    const [, forceUpdate] = useReducer((c: number) => c + 1, 0);

    useEffect(() => {
        const interval = setInterval(forceUpdate, 2000);
        return () => clearInterval(interval);
    }, []);

    return <>{children}</>;
};

export default RerenderContainer;
