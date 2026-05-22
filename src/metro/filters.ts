import { createFilterDefinition } from "./factories";
import { metroModules } from "./internals/modules";

export const byProps = createFilterDefinition(
    (props, m) => props.length === 1 ? m[props[0]] : props.every(p => m[p]),
    props => `rain.metro.byProps(${props.join(",")})`
);

export const byName = createFilterDefinition<[string]>(
    ([name], m) => {
        if (!m) return false;
        if (m.name === name) return true;
        if (m.displayName === name) return true;
        if (m.type && (m.type.name === name || m.type.displayName === name)) return true;
        if (m.render && (m.render.name === name || m.render.displayName === name)) return true;
        return false;
    },
    name => `rain.metro.byName(${name})`
);

export const byDisplayName = createFilterDefinition<[string]>(
    ([displayName], m) => {
        if (!m) return false;
        if (m.displayName === displayName) return true;
        if (m.type?.displayName === displayName) return true;
        if (m.render?.displayName === displayName) return true;
        return false;
    },
    name => `rain.metro.byDisplayName(${name})`
);

export const byTypeName = createFilterDefinition<[string]>(
    ([typeName], m) => {
        if (!m) return false;
        if (m.type?.name === typeName) return true;
        
        const check = (t: any): boolean => {
            if (!t) return false;
            if (t.name === typeName || t.displayName === typeName) return true;
            if (t.render && (t.render.name === typeName || t.render.displayName === typeName)) return true;
            if (t.type && check(t.type)) return true;
            return false;
        };
        
        return check(m.type) || check(m);
    },
    name => `rain.metro.byTypeName(${name})`
);

export const byStoreName = createFilterDefinition<[string]>(
    ([name], m) => m.getName?.length === 0 && m.getName() === name,
    name => `rain.metro.byStoreName(${name})`
);

export const byTypeDisplayName = createFilterDefinition<[string]>(
    ([displayName], m) => {
        if (!m) return false;
        if (m.type?.displayName === displayName) return true;
        
        const check = (t: any): boolean => {
            if (!t) return false;
            if (t.displayName === displayName) return true;
            if (t.render && t.render.displayName === displayName) return true;
            if (t.type && check(t.type)) return true;
            return false;
        };
        
        return check(m.type) || check(m);
    },
    name => `rain.metro.byTypeDisplayName(${name})`
);

export const byFilePath = createFilterDefinition<[string, boolean]>(
    ([path, exportDefault], _, id, defaultCheck) => (exportDefault === defaultCheck) && metroModules[id]?.__filePath === path,
    ([path, exportDefault]) => `rain.metro.byFilePath(${path},${exportDefault})`
);

export const byMutableProp = createFilterDefinition<[string]>(
    ([prop], m) => m?.[prop] && !Object.getOwnPropertyDescriptor(m, prop)?.get,
    prop => `rain.metro.byMutableProp(${prop})`
);
