import { after } from "@api/patcher";
import { findByFilePath } from "@metro";

export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) return () => false;

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        console.log("[ReviewDB-Segmented] Hook triggered successfully!");

        // Circular-safe search to find all arrays in the React element tree
        const findArrays = (obj: any, path = "ret", depth = 0): string[] => {
            if (!obj || depth > 4) return [];
            const found: string[] = [];
            
            if (Array.isArray(obj)) {
                if (obj.length > 0) {
                    found.push(`${path} (Length: ${obj.length})`);
                }
            } else if (typeof obj === "object") {
                for (const k of Object.keys(obj)) {
                    // Skip circular fiber loops and heavy style blocks
                    if (["_owner", "_store", "theme", "style", "styles", "navigator"].includes(k)) continue;
                    try {
                        found.push(...findArrays(obj[k], `${path}.${k}`, depth + 1));
                    } catch {}
                }
            }
            return found;
        };

        try {
            const arrayPaths = findArrays(ret);
            console.log("[ReviewDB-Segmented] Discovered array paths inside ret:\n" + arrayPaths.join("\n"));
        } catch (e) {
            console.log("[ReviewDB-Segmented] Scanning error: " + e);
        }
    });
};
