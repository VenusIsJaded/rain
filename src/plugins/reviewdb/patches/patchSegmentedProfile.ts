import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByName, findByProps, findByFilePath } from "@metro";
import { React } from "@metro/common";
import ReviewSection from "../components/ReviewSection";

export default () => {
    let unpatch: (() => void) | null = null;
    let interval: any = null;

    const tryPatch = () => {
        // Try official path first, then fallback to name/props for optimized builds
        let Mod = findByFilePath("design/components/SegmentedControl/native/SegmentedControlPages.native.tsx");
        if (!Mod) Mod = findByName("SegmentedControlPages", false);
        if (!Mod) Mod = findByProps("SegmentedControlPages");

        if (Mod) {
            const funcName = Mod.SegmentedControlPages ? "SegmentedControlPages" : (Mod.type ? "type" : "default");
            unpatch = after(funcName, Mod, (args, ret) => {
                const profileSections = findInReactTree(
                    ret?.props?.children[0]?.props?.item?.page?.props?.children,
                    r => r?.type?.displayName === "View" && r?.props?.children.findIndex((i: any) => i?.type?.name === "UserProfileBio" || i?.type?.name === "UserProfileAboutMeCard") !== -1,
                )?.props?.children;
                const userId = profileSections?.[profileSections?.length - 1]?.props?.userId;
                if (userId) profileSections?.push(React.createElement(ReviewSection, { userId }));
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
