import { findAssetId } from "@api/assets";
import { getDebugInfo } from "@api/debug";
import UpdateModule from "@api/native/modules/update";
import { useLoaderConfig, useSettings } from "@api/settings";
import { openAlert } from "@api/ui/alerts";
import { CodebergIcon, RainIcon } from "@assets";
import { Strings } from "@i18n";
import { CODEBERG, GITHUB } from "@lib/info";
import { AlertActionButton, AlertActions, AlertModal, Button, Stack, TableRow, TableRowGroup } from "@metro/common/components";
import { supportedVersions } from "rain-build-info";
import { useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";

let _setIsChecking: ((v: boolean) => void) | null = null;

/**
 * Compares two version strings.
 *
 * Handles both plain semver ("v0.9.2") and suffixed semver ("v0.9.2-20260518-202953")
 * by splitting on both dots and hyphens, then comparing each numeric segment left-to-right.
 */
function isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
    const parseVersion = (version: string) =>
        version.replace(/^v/, "").split(/[.\-]/).map(Number);
    const remote = parseVersion(remoteVersion);
    const current = parseVersion(currentVersion);

    for (let i = 0; i < Math.max(remote.length, current.length); i++) {
        const r = remote[i] ?? 0;
        const c = current[i] ?? 0;
        if (r !== c) return r > c;
    }
    return false;
}

export async function downloadUpdate() {
    _setIsChecking?.(true);
    try {
        await UpdateModule.nativeDownload();
    } finally {
        _setIsChecking?.(false);
    }
}

export function checkForUpdate() {
    const [hasUpdate, setHasUpdate] = React.useState(false);

    React.useEffect(() => {
        if (useLoaderConfig.getState().customLoadUrl.enabled) return;

        // Check GitHub releases (where the bundle is actually downloaded from)
        fetch("https://api.github.com/repos/VenusIsJaded/rain/releases/latest")
            .then(r => r.json())
            .then(latestRelease => {
                if (!latestRelease || !latestRelease.tag_name) return;
                setHasUpdate(isNewerVersion(latestRelease.tag_name, getDebugInfo().rain.version));
            })
            .catch(() => {}); // Silently ignore network errors
    }, []);

    return hasUpdate;
}

export async function versionCheck() {
    if (useLoaderConfig.getState().customLoadUrl.enabled === true) return;

    // Wait for settings to hydrate before checking
    const checkSettings = () => {
        if (useSettings.getState().disableUpdateWarnings === true) return;

        const version = getDebugInfo().discord.build;
        if (!supportedVersions.includes(version)) {
            openAlert(
                "incompatible-version-alert",
                <AlertModal
                    title={Strings.INCOMPATIBLE_VERSION}
                    content={Strings.INCOMPATIBLE_VERSION_DESC}
                    actions={
                        <AlertActions>
                            {Platform.OS === "android" && <AlertActionButton
                                text={Strings.OPEN_MANAGER}
                                variant="primary"
                                onPress={() => {
                                    Linking.openURL("raincord://");
                                }}
                            />}
                            {Platform.OS === "ios" && <AlertActionButton
                                text={Strings.IPA_DOWNLOAD}
                                variant="primary"
                                onPress={() => {
                                    Linking.openURL("https://codeberg.org/raincord/RainTweak/releases");
                                }}
                            />}
                            <AlertActionButton text={Strings.CONTINUE_ANYWAYS} variant="destructive" />
                        </AlertActions>
                    }
                />,
            );
        }
    };

    // Use setTimeout to ensure settings has had a chance to load
    setTimeout(checkSettings, 100);
}

export default function Updater() {
    const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
    _setIsChecking = setIsCheckingForUpdates;
    const debugInfo = getDebugInfo();

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title={Strings.INFO}>
                    <TableRow
                        label={Strings.RAIN}
                        icon={<TableRow.Icon source={{ uri: RainIcon }} />}
                        trailing={<TableRow.TrailingText text={debugInfo.rain.version} />}
                    />
                    <TableRow
                        arrow
                        label={Strings.CODEBERG}
                        icon={<TableRow.Icon source={{ uri: CodebergIcon }} />}
                        trailing={<TableRow.TrailingText text="raincord/rain" />}
                        onPress={() => Linking.openURL(CODEBERG)}
                    />
                </TableRowGroup>
                {checkForUpdate() && <View style={{ flexShrink: 1 }}>
                    <Button
                        text={Strings.UPDATE}
                        icon={findAssetId("DownloadIcon")}
                        disabled={isCheckingForUpdates}
                        loading={isCheckingForUpdates}
                        onPress={async () => {
                            await downloadUpdate();
                            openAlert(
                                "rain-update-restart-alert",
                                <AlertModal
                                    title={Strings.RELOAD_DISCORD}
                                    content={Strings.UPDATE_RESTART_MESSAGE}
                                    actions={
                                        <AlertActions>
                                            <AlertActionButton
                                                text={Strings.RESTART_NOW}
                                                variant="primary"
                                                onPress={() => {
                                                    UpdateModule.nativeReload();
                                                }}
                                            />
                                            <AlertActionButton text={Strings.RESTART_LATER} variant="secondary" />
                                        </AlertActions>
                                    }
                                />,
                            );
                        }}
                    />
                </View>}
            </Stack>
        </ScrollView>
    );
}
