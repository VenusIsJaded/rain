import { findAssetId } from "@api/assets";
import { after,before } from "@api/patcher";
import { semanticColors } from "@api/ui/components/color";
import { findInReactTree } from "@lib/utils";
import { findByProps, findByPropsLazy } from "@metro";
import { clipboard, React, ReactNative as RN } from "@metro/common";

const LazyActionSheet = findByPropsLazy("openLazy", "hideActionSheet");

const styles = RN.StyleSheet.create({
    iconComponent: {
        width: 24,
        height: 24,
        tintColor: semanticColors.INTERACTIVE_NORMAL,
    },
});

export default function patchDownload() {
    return before("openLazy", LazyActionSheet, (args: any[]) => {
        const [component, actionArgs, actionMessage] = args;
        const message = actionMessage?.message;
        if (actionArgs !== "MessageLongPressActionSheet" || !message) return;

        component.then((instance: any) => {
            const unpatch = after("default", instance, (_, res) => {
                React.useEffect(() => () => { unpatch(); }, []);

                // Get the main container groups
                const actionSheetContainer = findInReactTree(
                    res,
                    x => Array.isArray(x) && x[0]?.type?.name === "ActionSheetRowGroup"
                );

                if (!actionSheetContainer || !actionSheetContainer[1]) return res;

                // middleGroup is where message actions go
                const middleGroup = actionSheetContainer[1];
                const ActionSheetRow = middleGroup.props.children[0].type;

                const hasVoiceMessageFlag = typeof message.hasFlag === "function"
                    ? message.hasFlag(8192)
                    : (message.flags & 8192) === 8192;

                if (hasVoiceMessageFlag && message.attachments?.[0]?.url) {

                    const downloadButton = (
                        <ActionSheetRow
                            label="Download Voice Message"
                            icon={{
                                $$typeof: middleGroup.props.children[0].props.icon.$$typeof,
                                type: middleGroup.props.children[0].props.icon.type,
                                key: null,
                                ref: null,
                                props: {
                                    IconComponent: () => (
                                        <RN.Image
                                            resizeMode="cover"
                                            style={styles.iconComponent}
                                            source={findAssetId("ic_download_24px")}
                                        />
                                    ),
                                },
                            }}
                            onPress={async () => {
                                await findByPropsLazy("downloadMediaAsset").downloadMediaAsset(message.attachments[0].url, 0);
                                LazyActionSheet?.hideActionSheet();
                            }}
                            key="download-vm"
                        />
                    );

                    const copyButton = (
                        <ActionSheetRow
                            label="Copy Voice Message URL"
                            icon={{
                                $$typeof: middleGroup.props.children[0].props.icon.$$typeof,
                                type: middleGroup.props.children[0].props.icon.type,
                                key: null,
                                ref: null,
                                props: {
                                    IconComponent: () => (
                                        <RN.Image
                                            resizeMode="cover"
                                            style={styles.iconComponent}
                                            source={findAssetId("copy")}
                                        />
                                    ),
                                },
                            }}
                            onPress={async () => {
                                clipboard.setString(message.attachments[0].url);
                                LazyActionSheet?.hideActionSheet();
                            }}
                            key="copy-vm-url"
                        />
                    );

                    middleGroup.props.children = [...middleGroup.props.children, downloadButton, copyButton];
                }
            });
        });
    });
}
