import { React } from "@metro/common";
import { Forms } from "@metro/common/components";
import { useReadAllSettings } from "./storage";

const { FormSwitchRow } = Forms;

export default function ReadAllSettings() {
    const showAsCommand = useReadAllSettings(s => s.showAsCommand);
    const showInActionSheet = useReadAllSettings(s => s.showInActionSheet);
    const updateSettings = useReadAllSettings(s => s.updateSettings);

    return (
        <React.Fragment>
            <FormSwitchRow
                label="Show as Command"
                subLabel="Enable the /readall slash command"
                value={showAsCommand}
                onValueChange={(v: boolean) => updateSettings({ showAsCommand: v })}
            />
            <FormSwitchRow
                label="Show in Action Sheets"
                subLabel="Add a 'Read All' button when long-pressing servers or channels"
                value={showInActionSheet}
                onValueChange={(v: boolean) => updateSettings({ showInActionSheet: v })}
            />
        </React.Fragment>
    );
}
