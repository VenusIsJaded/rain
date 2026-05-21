import { findInTree } from "@lib/utils";
import { SearchFilter } from "@lib/utils/findInTree";

// Stable module-level reference — avoids allocating a new array literal
// on every call. findInReactTree is invoked on every JSX patch.
const REACT_WALKABLE = ["props", "children", "child", "sibling"] as const;

export default function findInReactTree(
    tree: { [key: string]: any },
    filter: SearchFilter
): any {
    return findInTree(tree, filter, {
        walkable: REACT_WALKABLE as unknown as string[],
    });
}
