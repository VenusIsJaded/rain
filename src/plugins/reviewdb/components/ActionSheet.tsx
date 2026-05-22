// Taken from https://github.com/nexpid/RevengePlugins/blob/main/src/stuff/components/ActionSheet.tsx
import { findByPropsLazy } from "@metro";
import { ReactNative as RN } from "@metro/common";
import { omit } from "es-toolkit";
import type { ViewProps } from "react-native";

import { find } from "../lib/utils";

const _ActionSheet =
    findByPropsLazy("ActionSheet")?.ActionSheet ??
    find(x => x.render?.name === "ActionSheet"); // thank you to @pylixonly for fixing this

const actionSheetComponents = findByPropsLazy(
    "ActionSheetCloseButton",
);

export const LazyActionSheet = findByPropsLazy("openLazy", "hideActionSheet") as unknown as {
    openLazy: (component: Promise<any>, key: string, props?: object) => void;
    hideActionSheet: () => void;
};
export const { openLazy, hideActionSheet } = LazyActionSheet;

type ActionSheetProps = React.PropsWithChildren<
    ViewProps & {
        title: string;
        onClose?: () => void;
    }
>;

export const ActionSheet = ((props: ActionSheetProps) => {
    return (
        <_ActionSheet>
            <actionSheetComponents.BottomSheetTitleHeader
                title={props.title}
                trailing={
                    <actionSheetComponents.ActionSheetCloseButton
                        onPress={
                            props.onClose ??
                            (() => {
                                hideActionSheet();
                            })
                        }
                    />
                }
            />
            <RN.View {...omit(props, ["title", "onClose"])} />
        </_ActionSheet>
    );
}) as {
    (props: ActionSheetProps): any;
    open: <Sheet extends React.FunctionComponent<any>>(
        sheet: Sheet,
        props: Parameters<Sheet>[0],
    ) => void;
};

ActionSheet.open = (sheet, props) => {
    openLazy(
        // OPTIMIZATION: Use Promise.resolve() instead of `new Promise(res => res(...))`
        // — avoids one microtask + closure allocation.
        Promise.resolve({ default: sheet }) as any,
        "ActionSheet",
        props,
    );
};
