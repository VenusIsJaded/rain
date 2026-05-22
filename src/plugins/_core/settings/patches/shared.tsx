import React from "react";

import { NavigationNative } from "@metro/common";
import { findByPropsLazy } from "@metro/wrappers";

import { RowConfig } from "..";

const tabsNavigationRef = findByPropsLazy("getRootNavigationRef");

// BUG FIX: "View config getter callback for component 'undefined' must be a
// function (received 'undefined'). Make sure to start component names with a
// capital letter."
//
// This crash was caused by `React` being used in JSX below (React.memo,
// React.createElement via JSX) without being imported. In the Metro bundler
// React is NOT globally available — every file that uses JSX or React APIs
// must explicitly import it. Without the import, `React` is undefined at
// runtime, so React.memo(...) throws immediately. When that exception
// propagates up through the ErrorBoundary patch, Discord's own ErrorBoundary
// renders the crash screen with the component-name-undefined message because
// the component reference is still undefined.
//
// Fix: add the explicit `import React from "react"` at the top of this file.
// This is also consistent with all other TSX files in the codebase.

export const CustomPageRenderer = React.memo(() => {
    const navigation = NavigationNative.useNavigation();
    const route = NavigationNative.useRoute();

    const { render: PageComponent, ...args } = route.params;

    React.useEffect(() => void navigation.setOptions({ ...args }), []);

    return <PageComponent />;
});

export function wrapOnPress(
    onPress: (() => unknown) | undefined,
    navigation?: any,
    renderPromise?: RowConfig["render"],
    screenOptions?: string | Record<string, any>,
    props?: any,
) {
    return async () => {
        if (onPress) return void onPress();

        const Component = await renderPromise!().then(m => m.default);

        if (typeof screenOptions === "string") {
            screenOptions = { title: screenOptions };
        }

        navigation ??= tabsNavigationRef.getRootNavigationRef();
        navigation.navigate("RAIN_CUSTOM_PAGE", {
            ...screenOptions,
            render: () => <Component {...props} />
        });
    };
}
