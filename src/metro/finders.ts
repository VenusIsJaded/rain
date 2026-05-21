import { getCacherForUniq } from "./internals/caches";
import { getModules, requireModule } from "./internals/modules";
import { FilterFn } from "./types";

// Reusable result object — callers destructure immediately, never hold a reference
const _filterResult = { exports: undefined as any, defaultExport: false };
const _emptyResult = {};

function filterExports(
    moduleExports: any,
    moduleId: number,
    filter: FilterFn,
) {
    if (
        moduleExports.default &&
        moduleExports.__esModule &&
        filter(moduleExports.default, moduleId, true)
    ) {
        _filterResult.exports = filter.raw ? moduleExports : moduleExports.default;
        _filterResult.defaultExport = !filter.raw;
        return _filterResult;
    }

    if (!filter.raw && filter(moduleExports, moduleId, false)) {
        _filterResult.exports = moduleExports;
        _filterResult.defaultExport = false;
        return _filterResult;
    }

    return _emptyResult;
}

/**
 * Returns the [id, defaultExports] of the first module where filter returns non-undefined, and undefined otherwise.
 * @param filter find calls filter once for each enumerable module's exports until it finds one where filter returns a thruthy value.
 */
export function findModule(filter: FilterFn) {
    const { cacheId, finish } = getCacherForUniq(filter.uniq, false);

    for (const [id, moduleExports] of getModules(filter.uniq, false)) {
        const { exports: testedExports, defaultExport } = filterExports(
            moduleExports,
            id,
            filter,
        );
        if (testedExports !== undefined) {
            cacheId(id, testedExports);
            return { id, defaultExport };
        }
    }

    finish(true);
    return {};
}

/**
 * Returns the id of the first module where filter returns non-undefined, and undefined otherwise.
 * @param filter find calls filter once for each enumerable module's exports until it finds one where filter returns a thruthy value.
 */
export function findModuleId(filter: FilterFn) {
    return findModule(filter)?.id;
}

/**
 * Returns the exports of the first module where filter returns non-undefined, and undefined otherwise.
 * @param filter find calls filter once for each enumerable module's exports until it finds one where filter returns a thruthy value.
 */
export function findExports(filter: FilterFn) {
    const { id, defaultExport } = findModule(filter);
    if (id == null) return;

    return defaultExport ? requireModule(id).default : requireModule(id);
}

/**
 * Returns the [id, defaultExports] of all modules where filter returns non-undefined.
 * @param filter findAll calls filter once for each enumerable module's exports, adding the exports to the returned array when filter returns a thruthy value.
 */
export function findAllModule(filter: FilterFn) {
    const { cacheId, finish } = getCacherForUniq(filter.uniq, true);
    const foundExports: {id: number, defaultExport: boolean}[] = [];

    for (const [id, moduleExports] of getModules(filter.uniq, true)) {
        const { exports: testedExports, defaultExport } = filterExports(
            moduleExports,
            id,
            filter,
        );
        if (testedExports !== undefined && typeof defaultExport === "boolean") {
            foundExports.push({ id, defaultExport });
            cacheId(id, testedExports);
        }
    }

    finish(foundExports.length === 0);
    return foundExports;
}

/**
 * Returns the ids of all modules where filter returns non-undefined.
 * @param filter findAll calls filter once for each enumerable module's exports, adding the exports to the returned array when filter returns a thruthy value.
 */
export function findAllModuleId(filter: FilterFn) {
    return findAllModule(filter).map(e => e.id);
}

/**
 * Returns the ids of all exports where filter returns non-undefined.
 * @param filter findAll calls filter once for each enumerable module's exports, adding the exports to the returned array when filter returns a thruthy value.
 */
export function findAllExports(filter: FilterFn) {
    return findAllModule(filter).map(ret => {
        if (ret.id == null) return;

        const { id, defaultExport } = ret;
        return defaultExport ? requireModule(id).default : requireModule(id);
    });
}
