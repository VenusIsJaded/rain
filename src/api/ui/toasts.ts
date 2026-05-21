import { findAssetId } from "@api/assets";
import { toasts } from "@metro/common";
import { Strings } from "@rain/i18n";

let _toastId = 0;

export const showToast = (content: string, asset?: number) => toasts.open({
    key: `rain-toast-${++_toastId}`,
    content: content,
    source: asset,
    icon: asset,
});

showToast.showCopyToClipboard = (message = Strings.COPIED_TO_CLIPBOARD) => {
    showToast(message, findAssetId("toast_copy_link"));
};
