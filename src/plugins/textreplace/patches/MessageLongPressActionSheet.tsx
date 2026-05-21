import { findAssetId } from "@api/assets";
import { after, before } from "@api/patcher";
import { showToast } from "@api/ui/toasts";
import { findInReactTree } from "@lib/utils";
import { findByProps, findByPropsLazy } from "@metro";
import { React } from "@metro/common";

import { useTextReplaceSettings } from "../storage";

const LazyActionSheet = findByPropsLazy("openLazy", "hideActionSheet");
const rowMod = findByPropsLazy("ActionSheetRow");
const ActionSheetRow = (props) => { const Comp = rowMod.ActionSheetRow; return <Comp {...props} />; };
const DownloadIcon = findAssetId("DownloadIcon");
const JSON_CODEBLOCK_PATTERN = /^```(?:json)\n([\s\S]*?)```$/gm;

export default function patchMessageLongPressActionSheet() {
    return before("openLazy", LazyActionSheet, ([component, key, msg]) => {
        if (key !== "MessageLongPressActionSheet") return;
        const content = msg?.message?.content;
        if (!content) return;

        component.then((instance: any) => {
            const unpatch = after("default", instance, (_, res) => {
                React.useEffect(() => {
                    return () => {
                        unpatch();
                    };
                }, []);

                const rules = [...content.matchAll(JSON_CODEBLOCK_PATTERN)]
                    .map(m => {
                        try {
                            return JSON.parse(m[1]);
                        } catch {
                            return null;
                        }
                    })
                    .filter(
                        r =>
                            r &&
                            typeof r.name === "string" &&
                            typeof r.match === "string" &&
                            typeof r.replace === "string",
                    );

                if (!rules.length) return;

                const buttons = findInReactTree(
                    res,
                    x => Array.isArray(x) && x.some(c => c?.type?.name === "ActionSheetRow"),
                );
                if (!buttons) return;

                rules.forEach((rule: any) => {
                    buttons.unshift(
                        <ActionSheetRow
                            label={`Import Rule: ${rule.name}`}
                            icon={<ActionSheetRow.Icon source={DownloadIcon} />}
                            onPress={() => {
                                LazyActionSheet.hideActionSheet();
                                const currentRules = useTextReplaceSettings.getState().rules;
                                useTextReplaceSettings.getState().updateSettings({ rules: [...currentRules, rule] });
                                showToast(`Imported ${rule.name}`, DownloadIcon);
                            }}
                        />,
                    );
                });
            });
        });
    });
}
