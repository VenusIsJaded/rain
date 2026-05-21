import { findByPropsLazy } from "@metro";
import { ScrollView } from "react-native";

import { useRainEnhancementsSettings } from "./storage";

const {
    TableSwitchRow,
    TableRowGroup,
} = findByPropsLazy("TableRow");
const { Stack } = findByPropsLazy("Stack");

export default () => {
    const settings = useRainEnhancementsSettings();

    return (
        <ScrollView style={{ flex: 1 }}>
            <Stack
                style={{ paddingVertical: 24, paddingHorizontal: 12 }}
                spacing={24}
            >
                <TableRowGroup title="Realmoji" titleStyleType="no_border">
                    <TableSwitchRow
                        label="Transform fake emojis into real ones"
                        onValueChange={(v: boolean) => {
                            settings.updateSettings({ transformEmoji: v });
                        }}
                        value={settings.transformEmoji ?? true}
                    />
                    <TableSwitchRow
                        label="Transform fake stickers into real ones"
                        onValueChange={(v: boolean) => {
                            settings.updateSettings({ transformSticker: v });
                        }}
                        value={settings.transformSticker ?? true}
                    />
                </TableRowGroup>
            </Stack>
        </ScrollView>
    );
};
