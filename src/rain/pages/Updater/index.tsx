import { findAssetId } from "@api/assets";
import { getDebugInfo } from "@api/debug";
import UpdateModule from "@api/native/modules/update";
import { useLoaderConfig, useSettings } from "@api/settings";
import { openAlert } from "@api/ui/alerts";
import { CodebergIcon, RainIcon } from "@assets";
import { Strings } from "@i18n";
import { CODEBERG } from "@lib/info";
import { AlertActionButton, AlertActions, AlertModal, Button, Stack, TableRow, TableRowGroup, TableSwitchRow } from "@metro/common/components";
import { supportedVersions } from "rain-build-info";
import { useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";

interface GitHubRelease {
    tag_name?: string;
    prerelease?: boolean;
    draft?: boolean;
    published_at?: string;
}

interface ParsedVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease: string[];
}

let _setIsChecking: ((v: boolean) => void) | null = null;

function parseVersion(version: string): ParsedVersion | null {
    const sanitized = version.replace(/^v/, "").split("+")[0];
    const [core, prereleasePart] = sanitized.split(/-(.+)/, 2);
    const [major, minor, patch] = core.split(".").map(Number);

    if ([major, minor, patch].some(Number.isNaN)) return null;

    return {
        major,
        minor,
        patch,
        prerelease: prereleasePart ? prereleasePart.split(/[.\-]/).filter(Boolean) : [],
    };
}

function comparePrereleaseIdentifiers(left: string, right: string): number {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    const leftIsNumeric = !Number.isNaN(leftNumber);
    const rightIsNumeric = !Number.isNaN(rightNumber);

    if (leftIsNumeric && rightIsNumeric) return leftNumber - rightNumber;
    if (leftIsNumeric) return -1;
    if (rightIsNumeric) return 1;
    return left.localeCompare(right);
}

function compareVersions(left: string, right: string): number {
    const parsedLeft = parseVersion(left);
    const parsedRight = parseVersion(right);

    if (!parsedLeft || !parsedRight) return left.localeCompare(right);

    for (const key of ["major", "minor", "patch"] as const) {
        if (parsedLeft[key] !== parsedRight[key]) {
            return parsedLeft[key] - parsedRight[key];
        }
    }

    const leftPrerelease = parsedLeft.prerelease;
    const rightPrerelease = parsedRight.prerelease;

    if (leftPrerelease.length === 0 && rightPrerelease.length === 0) return 0;
    if (leftPrerelease.length === 0) return 1;
    if (rightPrerelease.length === 0) return -1;

    for (let i = 0; i < Math.max(leftPrerelease.length, rightPrerelease.length); i++) {
        const leftIdentifier = leftPrerelease[i];
        const rightIdentifier = rightPrerelease[i];

        if (leftIdentifier == null) return -1;
        if (rightIdentifier == null) return 1;

        const comparison = comparePrereleaseIdentifiers(leftIdentifier, rightIdentifier);
        if (comparison !== 0) return comparison;
    }

    return 0;
}

function isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
    return compareVersions(remoteVersion, currentVersion) > 0;
}

function selectRelease(releases: GitHubRelease[], usePrereleases: boolean) {
    const stableReleases = releases.filter(release => !release.draft && !release.prerelease && release.tag_name);
    const prereleaseReleases = releases.filter(release => !release.draft && release.prerelease && release.tag_name);
    const candidates = usePrereleases && prereleaseReleases.length > 0 ? prereleaseReleases : stableReleases;

    return candidates.sort((left, right) => {
        const versionComparison = compareVersions(right.tag_name!, left.tag_name!);
        if (versionComparison !== 0) return versionComparison;
        return (right.published_at ?? "").localeCompare(left.published_at ?? "");
    })[0] ?? null;
}

async function fetchSelectedRelease(usePrereleases: boolean): Promise<GitHubRelease | null> {
    const response = await fetch("https://api.github.com/repos/VenusIsJaded/rain/releases");
    const releases = await response.json();
    if (!Array.isArray(releases)) return null;
    return selectRelease(releases, usePrereleases);
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
    const usePrereleases = useLoaderConfig(state => state.usePrereleases);
    const customLoadUrlEnabled = useLoaderConfig(state => state.customLoadUrl.enabled);

    React.useEffect(() => {
        let cancelled = false;

        if (customLoadUrlEnabled) {
            setHasUpdate(false);
            return;
        }

        fetchSelectedRelease(usePrereleases)
            .then(latestRelease => {
                if (cancelled || !latestRelease?.tag_name) return;
                setHasUpdate(isNewerVersion(latestRelease.tag_name, getDebugInfo().rain.version));
            })
            .catch(() => {
                if (!cancelled) setHasUpdate(false);
            });

        return () => {
            cancelled = true;
        };
    }, [usePrereleases, customLoadUrlEnabled]);

    return hasUpdate;
}

export async function versionCheck() {
    if (useLoaderConfig.getState().customLoadUrl.enabled === true) return;

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

    setTimeout(checkSettings, 100);
}

export default function Updater() {
    const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
    _setIsChecking = setIsCheckingForUpdates;

    const debugInfo = getDebugInfo();
    const loaderConfig = useLoaderConfig();
    const usePrereleases = loaderConfig.usePrereleases;

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
                <TableRowGroup title={Strings.SETTINGS}>
                    <TableSwitchRow
                        label={Strings.PRERELEASE_CHANNEL}
                        subLabel={Strings.PRERELEASE_CHANNEL_DESC}
                        icon={<TableRow.Icon source={findAssetId("ic_warning_24px")} />}
                        value={usePrereleases}
                        onValueChange={(value: boolean) => {
                            loaderConfig.updateLoaderConfig({ usePrereleases: value });
                            void UpdateModule.nativeSetUsePrereleases(value).catch(() => {});
                        }}
                    />
                </TableRowGroup>
                {checkForUpdate() && <View style={{ flexShrink: 1 }}>
                    <Button
                        text={Strings.UPDATE}
                        icon={findAssetId("DownloadIcon")}
                        disabled={isCheckingForUpdates}
                        loading={isCheckingForUpdates}
                        onPress={async () => {
                            try {
                                await UpdateModule.nativeSetUsePrereleases(usePrereleases);
                            } catch {}
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
                                                    void UpdateModule.nativeSetUsePrereleases(usePrereleases).catch(() => {});
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
