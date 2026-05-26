import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

export default () => {
    let afterUnpatch: (() => void) | null = null;
    let interval: any = null;

    const tryPatch = () => {
        const Mod = findByTypeName("SimplifiedUserProfileContent");
        if (Mod && typeof Mod.type === "function") {
            afterUnpatch = after("type", Mod, (args, ret) => {
                const profileSections = findInReactTree(
                    ret,
                    r =>
                        r?.type?.displayName === "View" &&
                        r?.props?.children.findIndex(
                            (i: any) =>
                                i?.type?.name === "SimplifiedUserProfileAboutMeCard",
                        ) !== -1,
                )?.props?.children;

                const userId = args[0]?.user?.id;
                if (userId) profileSections?.push(React.createElement(ReviewSection, { userId }));
            });
            return true;
        }
        return false;
    };

    if (!tryPatch()) {
        interval = setInterval(() => {
            if (tryPatch()) clearInterval(interval);
        }, 1000);
    }

    return () => {
        if (interval) clearInterval(interval);
        if (afterUnpatch) afterUnpatch();
    };
};
