export type SearchTree = Record<string, any>;
export type SearchFilter = (tree: SearchTree) => boolean;
export interface FindInTreeOptions {
    walkable?: string[];
    ignore?: string[];
    maxDepth?: number;
}

export default function findInTree(
    tree: SearchTree,
    filter: SearchFilter,
    {
        walkable = [],
        ignore = [],
        maxDepth = 100
    }: FindInTreeOptions = {},
): any | undefined {
    if (!tree || typeof tree !== "object") return;

    // Convert arrays to lightweight O(1) property lookup tables
    const walkableMap: Record<string, boolean> = {};
    const hasWalkable = walkable.length > 0;
    if (hasWalkable) {
        for (let i = 0; i < walkable.length; i++) {
            walkableMap[walkable[i]] = true;
        }
    }

    const ignoreMap: Record<string, boolean> = {};
    const hasIgnore = ignore.length > 0;
    if (hasIgnore) {
        for (let i = 0; i < ignore.length; i++) {
            ignoreMap[ignore[i]] = true;
        }
    }

    // Stack holds [current_node, depth]
    const stack: [any, number][] = [[tree, 0]];
    const visited = new Set<any>(); // Protects against circular tree structures (Fibers)

    while (stack.length > 0) {
        const [current, depth] = stack.pop()!;

        if (depth > maxDepth || !current || visited.has(current)) continue;
        visited.add(current);

        try {
            if (filter(current)) return current;
        } catch {}

        if (Array.isArray(current)) {
            // Push elements to the stack in reverse order to preserve traversal order
            for (let i = current.length - 1; i >= 0; i--) {
                const item = current[i];
                if (item && typeof item === "object") {
                    stack.push([item, depth + 1]);
                }
            }
        } else {
            const keys = Object.keys(current);
            for (let i = keys.length - 1; i >= 0; i--) {
                const key = keys[i];
                if (hasWalkable && !walkableMap[key]) continue;
                if (hasIgnore && ignoreMap[key]) continue;

                const value = current[key];
                if (value && typeof value === "object") {
                    stack.push([value, depth + 1]);
                }
            }
        }
    }
}
