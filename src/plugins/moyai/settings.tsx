import { lazyDestructure } from "@lib/utils/lazy";
import { findByProps, findByPropsLazy } from "@metro";
import { ScrollView } from "react-native";

import { useMoyaiSettings } from "./storage";

const { TableSwitchRow, TableRowGroup } = lazyDestructure(() => findByProps("TableRow"));
const { Stack } = lazyDestructure(() => findByProps("Stack"));

export default function MoyaiSettings() {
    const settings = useMoyaiSettings();

    return (
        <ScrollView style={{ flex: 1 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title="Behavior">
                    <TableSwitchRow
                        label="Play on reactions"
                        onValueChange={(value: boolean) => {
                            settings.updateSettings({ allowReactions: value });
                        }}
                        value={settings.allowReactions}
                    />
                </TableRowGroup>
            </Stack>
        </ScrollView>
    );
}
