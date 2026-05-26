export type SearchTree = Record<string, any>;
export type SearchFilter = (tree: SearchTree) => boolean;
export interface FindInTreeOptions {
    walkable?: string[];
    ignore?: string[];
    maxDepth?: number;
}

// Use a Symbol for visited tracking to completely avoid Set hashing overhead
const VISITED_SYMBOL = Symbol.for("rain.findInTree.visited");

// Module-level cache for maps to avoid recreating them on every single render
let cachedWalkable: string[] | undefined;
let cachedWalkableMap: Record<string, boolean> | undefined;
let cachedIgnore: string[] | undefined;
let cachedIgnoreMap: Record<string, boolean> | undefined;

export default function findInTree(
    tree: SearchTree,
    filter: SearchFilter,
    { walkable = [], ignore = [], maxDepth = 100 }: FindInTreeOptions = {},
): any | undefined {
    if (!tree || typeof tree !== "object") return undefined;

    let walkableMap: Record<string, boolean> | undefined;
    if (walkable.length > 0) {
        if (walkable === cachedWalkable && cachedWalkableMap) {
            walkableMap = cachedWalkableMap;
        } else {
            walkableMap = {};
            for (let i = 0; i < walkable.length; i++) walkableMap[walkable[i]] = true;
            cachedWalkable = walkable;
            cachedWalkableMap = walkableMap;
        }
    }

    let ignoreMap: Record<string, boolean> | undefined;
    if (ignore.length > 0) {
        if (ignore === cachedIgnore && cachedIgnoreMap) {
            ignoreMap = cachedIgnoreMap;
        } else {
            ignoreMap = {};
            for (let i = 0; i < ignore.length; i++) ignoreMap[ignore[i]] = true;
            cachedIgnore = ignore;
            cachedIgnoreMap = ignoreMap;
        }
    }

    const hasWalkable = !!walkableMap;
    const hasIgnore = !!ignoreMap;

    const nodeStack: any[] = [tree];
    const depthStack: number[] = [0];
    const visitedNodes: any[] = []; 

    let result: any = undefined;

    while (nodeStack.length > 0) {
        const current = nodeStack.pop();
        const depth = depthStack.pop()!;

        if (depth > maxDepth || !current || typeof current !== "object") continue;
        if (current[VISITED_SYMBOL]) continue;

        current[VISITED_SYMBOL] = true;
        visitedNodes.push(current);

        try {
            if (filter(current)) {
                result = current;
                break;
            }
        } catch {}

        const nextDepth = depth + 1;

        if (Array.isArray(current)) {
            for (let i = current.length - 1; i >= 0; i--) {
                const item = current[i];
                if (item && typeof item === "object") {
                    nodeStack.push(item);
                    depthStack.push(nextDepth);
                }
            }
        } else {
            // for...in avoids allocating a new array via Object.keys() on every node
            for (const key in current) {
                if (!Object.prototype.hasOwnProperty.call(current, key)) continue;
                if (hasWalkable && !walkableMap![key]) continue;
                if (hasIgnore && ignoreMap![key]) continue;

                const value = current[key];
                if (value && typeof value === "object") {
                    nodeStack.push(value);
                    depthStack.push(nextDepth);
                }
            }
        }
    }

    // Clean up the symbol (setting to false is much faster than 'delete')
    for (let i = 0; i < visitedNodes.length; i++) {
        visitedNodes[i][VISITED_SYMBOL] = false;
    }

    return result;
}
