import { createFilterDefinition } from "./factories";
import { metroModules } from "./internals/modules";

export const byProps = createFilterDefinition(
  (props, m) => props.length === 1 ? m[props[0]] : props.every(p => m[p]),
  props => `rain.metro.byProps(${props.join(",")})`
);

export const byName = createFilterDefinition<[string]>(
  ([name], m) => m.name === name,
  name => `rain.metro.byName(${name})`
);

export const byDisplayName = createFilterDefinition<[string]>(
  ([displayName], m) => m.displayName === displayName,
  name => `rain.metro.byDisplayName(${name})`
);

export const byTypeName = createFilterDefinition<[string]>(
  ([typeName], m) => m.type?.name === typeName,
  name => `rain.metro.byTypeName(${name})`
);

export const byStoreName = createFilterDefinition<[string]>(
  ([name], m) => m.getName?.length === 0 && m.getName() === name,
  name => `rain.metro.byStoreName(${name})`
);

export const byTypeDisplayName = createFilterDefinition<[string]>(
  ([displayName], m) => m.type?.displayName === displayName,
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
