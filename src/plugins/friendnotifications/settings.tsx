import { React } from "@metro/common";
import { Forms } from "@metro/common/components";
import { useFriendNotificationsSettings } from "./storage";

const { FormSwitchRow } = Forms;

export default function FriendNotificationsSettings() {
    const notifyOnline = useFriendNotificationsSettings(s => s.notifyOnline);
    const notifyOffline = useFriendNotificationsSettings(s => s.notifyOffline);
    const updateSettings = useFriendNotificationsSettings(s => s.updateSettings);

    return (
        <React.Fragment>
            <FormSwitchRow
                label="Notify when Online"
                subLabel="Shows a toast when a friend comes online"
                value={notifyOnline}
                onValueChange={(v: boolean) => updateSettings({ notifyOnline: v })}
            />
            <FormSwitchRow
                label="Notify when Offline"
                subLabel="Shows a toast when a friend goes offline"
                value={notifyOffline}
                onValueChange={(v: boolean) => updateSettings({ notifyOffline: v })}
            />
        </React.Fragment>
    );
}
