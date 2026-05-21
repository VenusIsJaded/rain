import { instead } from "@api/patcher";
import { findByPropsLazy } from "@metro";

export default function getPatches() {
    const canUse = findByPropsLazy("canUseClientThemes");

    return [
        instead("canUseClientThemes", canUse, () => true),
    ];
}
