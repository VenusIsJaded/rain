import { findInTree } from "@lib/utils";
import { SearchFilter } from "@lib/utils/findInTree";

// Stable module-level constant — avoids reallocating the array on every call.
// findInReactTree is invoked heavily during rendering patches.
const REACT_WALKABLE = ["props", "children", "child", "sibling"] as const;

export default function findInReactTree(
    tree: { [key: string]: any },
    filter: SearchFilter
): any {
    return findInTree(tree, filter, {
        walkable: REACT_WALKABLE as unknown as string[],
    });
}
