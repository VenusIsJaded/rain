import { instead } from "@api/patcher";
import { findByName, findByProps } from "@metro";
import { React } from "@metro/common";
import ReviewCard from "../components/ReviewCard";

export default () => {
    let unpatch: (() => void) | null = null;
    let interval: any = null;

    const tryPatch = () => {
        let Mod = findByName("GuildActionSheetProgress", false);
        if (!Mod) Mod = findByName("GuildActionSheet", false);
        if (!Mod) Mod = findByProps("GuildActionSheet");
        if (!Mod) Mod = findByName("GuildProfile", false);

        if (Mod) {
            const funcName = Mod.default ? "default" : "type";
            unpatch = instead(funcName, Mod, (args, ret) => {
                const guildId = args[0]?.guild?.id;
                if (guildId) return React.createElement(ReviewCard, { userId: guildId });
                return ret;
            });
            return true;
        }
        return false;
    };

    if (!tryPatch()) {
        interval = setInterval(() => { if (tryPatch()) clearInterval(interval); }, 1000);
    }
    return () => { if (interval) clearInterval(interval); if (unpatch) unpatch(); };
};
