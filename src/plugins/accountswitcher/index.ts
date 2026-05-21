import { after } from "@api/patcher";
import { findByPropsLazy, findByStoreNameLazy } from "@metro";
import { definePlugin } from "@plugins";
import { Developers } from "@rain/Developers";

const AccountDispatcher = findByPropsLazy("getCanUseMultiAccountMobile");
const MultiAccountStore = findByStoreNameLazy("MultiAccountStore");
const patches: (() => boolean)[] = [];

export default definePlugin({
    name: "AccountSwitcher",
    description: "Enables account switcher because discord got rid of experiment",
    author: [Developers.John, Developers.cocobo1],
    id: "accountswitcher",
    version: "1.1.0",
    start() {
        patches.push(
            after("getCanUseMultiAccountMobile", AccountDispatcher, () => {
                return true;
            }),
        );

        Object.defineProperty(MultiAccountStore, "canUseMultiAccountNotifications", {
            get: () => true,
            configurable: true,
        });
    },
    stop() {
        for (const unpatch of patches) unpatch();
        patches.length = 0;
        delete (MultiAccountStore as any).canUseMultiAccountNotifications;
    }
});
