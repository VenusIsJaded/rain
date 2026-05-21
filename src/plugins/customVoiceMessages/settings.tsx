import { Stack, TableRowGroup, TableSwitchRow } from "@metro/common/components";
import { ScrollView } from "react-native";

import { useCustomVoiceMessagesSettings } from "./storage";

export default function CustomVoiceMessagesSettings() {
    const settings = useCustomVoiceMessagesSettings();

    return (
        <ScrollView style={{ flex: 1 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title="Voice Message Settings">
                    <TableSwitchRow
                        label="Send audio files as Voice Message"
                        subLabel="Intercepts audio uploads and sends them as voice messages."
                        value={!!settings.sendAsVM}
                        onValueChange={(v: boolean) => useCustomVoiceMessagesSettings.getState().updateSettings({ sendAsVM: v })}
                    />
                    <TableSwitchRow
                        label="Show every audio file as a Voice Message"
                        subLabel="Forces all received audio attachments to display as voice messages."
                        value={!!settings.allAsVM}
                        onValueChange={(v: boolean) => useCustomVoiceMessagesSettings.getState().updateSettings({ allAsVM: v })}
                    />
                </TableRowGroup>
            </Stack>
        </ScrollView>
    );
}
