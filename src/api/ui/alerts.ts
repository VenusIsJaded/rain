import { lazyDestructure } from "@lib/utils/lazy";
import { findByProps } from "@metro";
// BUG FIX: React.ComponentType<any> and React.createElement were used below
// but React was never imported. In Metro, React is NOT a global — every file
// that references React.* must import it explicitly. Without this import,
// showCustomAlert throws at call time: "React is not defined".
import { React } from "@metro/common";

export const { openAlert, dismissAlert } = lazyDestructure(() => findByProps("openAlert", "dismissAlert"));

import InputAlert, { InputAlertProps } from "@api/ui/components/InputAlert";
import { findByPropsLazy } from "@metro/wrappers";

const Alerts = findByPropsLazy("openLazy", "close");

interface InternalConfirmationAlertOptions extends Omit<ConfirmationAlertOptions, "content"> {
    content?: ConfirmationAlertOptions["content"];
    body?: ConfirmationAlertOptions["content"];
}

export interface ConfirmationAlertOptions {
    title?: string;
    content: string | JSX.Element | (string | JSX.Element)[];
    confirmText?: string;
    confirmColor?: string;
    onConfirm: () => void;
    secondaryConfirmText?: string;
    onConfirmSecondary?: () => void;
    cancelText?: string;
    onCancel?: () => void;
    isDismissable?: boolean;
}

export function showConfirmationAlert(options: ConfirmationAlertOptions) {
    const internalOptions = options as InternalConfirmationAlertOptions;

    internalOptions.body = options.content;
    delete internalOptions.content;

    internalOptions.isDismissable ??= true;

    return Alerts.show(internalOptions);
}

export const showCustomAlert = (component: React.ComponentType<any>, props: any) => Alerts.openLazy({
    importer: async () => () => React.createElement(component, props),
});

export const showInputAlert = (options: InputAlertProps) => showCustomAlert(InputAlert, options);
