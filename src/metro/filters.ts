import { createFilterDefinition } from "./factories";
import { metroModules } from "./internals/modules";

export const byProps = createFilterDefinition<string[]>(
    (props, m) => {
        if (!m || typeof m !== "object") return false;
        for (let i = 0; i < props.length; i++) {
            if (!(props[i] in m)) return false;
        }
        return true;
    },
    props => `rain.metro.byProps(${props.join(",")})`
);

export const byName = createFilterDefinition<[string]>(
    ([name], m) => m && m.name === name,
    name => `rain.metro.byName(${name})`
);

export const byDisplayName = createFilterDefinition<[string]>(
    ([displayName], m) => m && m.displayName === displayName,
    name => `rain.metro.byDisplayName(${name})`
);

export const byTypeName = createFilterDefinition<[string]>(
    ([typeName], m) => m && m.type?.name === typeName,
    name => `rain.metro.byTypeName(${name})`
);

export const byStoreName = createFilterDefinition<[string]>(
    ([name], m) => m && typeof m.getName === "function" && m.getName() === name,
    name => `rain.metro.byStoreName(${name})`
);

export const byTypeDisplayName = createFilterDefinition<[string]>(
    ([displayName], m) => m && m.type?.displayName === displayName,
    name => `rain.metro.byTypeDisplayName(${name})`
);

export const byFilePath = createFilterDefinition<[string, boolean]>(
    // module return depends on defaultCheck. if true, it'll return module.default, otherwise the whole module
    ([path, exportDefault], _, id, defaultCheck) => (exportDefault === defaultCheck) && metroModules[id]?.__filePath === path,
    ([path, exportDefault]) => `rain.metro.byFilePath(${path},${exportDefault})`
);

export const byMutableProp = createFilterDefinition<[string]>(
    ([prop], m) => m && m[prop] !== undefined && !Object.getOwnPropertyDescriptor(m, prop)?.get,
    prop => `rain.metro.byMutableProp(${prop})`
);
