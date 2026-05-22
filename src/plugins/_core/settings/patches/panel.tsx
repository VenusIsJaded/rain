import { after } from "@api/patcher";
import findInReactTree from "@lib/utils/findInReactTree";
import { i18n, NavigationNative } from "@metro/common";
import { LegacyFormDivider, LegacyFormIcon, LegacyFormRow, LegacyFormSection } from "@metro/common/components";
import { findByNameLazy } from "@metro/wrappers";
import React from "react";

import { registeredSections } from "..";
import { wrapOnPress } from "./shared";

function SettingsSection() {
    const navigation = NavigationNative.useNavigation();

    return <>
        {Object.keys(registeredSections).map(sect => {
            const rows = Array.isArray(registeredSections[sect]) ? registeredSections[sect] : [];
            if (rows.length === 0) return null;
            return (
                <LegacyFormSection key={sect} title={sect}>
                    {rows.filter(r => r.usePredicate?.() ?? true).map((row, i, arr) => (
                        // BUG FIX: React.Fragment shorthand (<>) cannot take a key prop.
                        // Using React.Fragment explicitly so each item has a stable key,
                        // preventing React from destroying and recreating rows on re-render.
                        <React.Fragment key={row.key ?? i}>
                            <LegacyFormRow
                                label={row.title()}
                                leading={<LegacyFormIcon source={row.icon} />}
                                trailing={<LegacyFormRow.Arrow label={row.useTrailing?.() || undefined} />}
                                onPress={wrapOnPress(row.onPress, navigation, row.render, row.title())}
                            />
                            {i !== arr.length - 1 && <LegacyFormDivider />}
                        </React.Fragment>
                    ))}
                </LegacyFormSection>
            );
        })}
    </>;
}

export function patchPanelUI(unpatches: (() => void | boolean)[]) {
    const unpatch = after("default", findByNameLazy("UserSettingsOverviewWrapper", false), (_a, ret) => {
        const UserSettingsOverview = findInReactTree(ret.props.children, n => n.type?.name === "UserSettingsOverview");

        unpatches.push(after("renderSupportAndAcknowledgements", UserSettingsOverview.type.prototype, (_args, { props: { children } }) => {
            const index = children.findIndex((c: any) => c?.type?.name === "UploadLogsButton");
            if (index !== -1) children.splice(index, 1);
        }));

        unpatches.push(after("render", UserSettingsOverview.type.prototype, (_args, res) => {
            const titles = [i18n.Messages.BILLING_SETTINGS, i18n.Messages.PREMIUM_SETTINGS];

            const sections = findInReactTree(
                res.props.children,
                n => n?.children?.[1]?.type === LegacyFormSection
            )?.children || res.props.children;

            if (sections) {
                const index = sections.findIndex((c: any) => titles.includes(c?.props.label));
                sections.splice(-~index || 4, 0, <SettingsSection />);
            }
        }));
    }, true);

    unpatches.push(unpatch);
}
