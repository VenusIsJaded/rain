import { readdir, stat, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const pluginsDirectoryPath = path.join(projectRoot, "src/plugins");

// @ts-ignore
async function gatherPlugins(plugins = [], dir = pluginsDirectoryPath, relativePath = "") {
    try {
        const pluginDirs = await readdir(dir, { recursive: false });

        for (const pluginDir of pluginDirs) {
            const pluginPath = path.join(dir, pluginDir);
            const stats = await stat(pluginPath);

            if (stats.isDirectory()) {
                const baseName = path.basename(pluginDir);
                const newRelativePath = relativePath ? `${relativePath}/${pluginDir}` : pluginDir;

                if (baseName.startsWith("_") || baseName.startsWith(".")) {
                    await gatherPlugins(plugins, pluginPath, newRelativePath);
                } else {
                    const pluginId = newRelativePath
                        .split("/")
                        .map(segment => segment.replace(/^[._]/, ""))
                        .filter(segment => segment)
                        .join(".");

                    plugins.push({
                        id: pluginId,
                        relativePath: newRelativePath,
                        fullPath: pluginPath,
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error gathering plugins:", error);
    }

    return plugins;
}

async function extractPluginMetadata(pluginPath) {
    try {
        const indexPath = (await readdir(pluginPath).then(files =>
            files.find(f => f === "index.ts" || f === "index.tsx")
        )) ?? "index.ts";
        const content = await readFile(path.join(pluginPath, indexPath), "utf-8");
        const name = content.match(/name:\s*["']([^"']+)["']/)?.[1];
        const description = content.match(/description:\s*["']([^"']+)["']/)?.[1];
        const version = content.match(/version:\s*["']([^"']+)["']/)?.[1];
        const requiresRestart = /requiresRestart:\s*true/.test(content);
        const devOnly = /devOnly:\s*true/.test(content);
        const platformsMatch = content.match(/platforms:\s*\[\s*([^\]]+?)\s*\]/);
        const platforms = platformsMatch
            ? platformsMatch[1].split(",").map(s => s.trim().replace(/["']/g, "")).filter(Boolean)
            : null;
        return { name, description, version, requiresRestart, devOnly, platforms };
    } catch {
        return null;
    }
}

function wrapRequire(id, importPath) {
    return `    "${id}": (() => {
        try {
            return require("${importPath}").default;
        } catch (error) {
            console.error("[Failed to compile '${id}' from '${importPath}':", error.message);
            return null;
        }
    })(),`;
}

function wrapGetter(id, importPath) {
    return `    get "${id}"() {
        try {
            return require("${importPath}").default;
        } catch (error) {
            console.error("[Failed to compile '${id}' from '${importPath}':", error.message);
            return null;
        }
    },`;
}

function wrapImport(id, importPath) {
    return `    get "${id}"() {
        return import("${importPath}").then(m => m.default).catch(err => {
            console.error("[PluginImporter] Failed to dynamically import '${id}':", err.message);
            return null;
        });
    }`;
}

async function makeModule(options = {}) {
    const plugins = await gatherPlugins();

    if (plugins.length === 0) {
        console.warn("Warning: No plugins found in", pluginsDirectoryPath);
        return "export default {};\nexport var pluginIds = [];\nexport var pluginMetadata = {};";
    }

    const corePlugins = [];
    const optionalPlugins = [];

    for (const plugin of plugins) {
        if (plugin.id.startsWith("core.") || plugin.relativePath.startsWith("_core/")) {
            corePlugins.push(plugin);
        } else {
            optionalPlugins.push(plugin);
        }
    }

    const coreImports = corePlugins.map(({ id, relativePath }) => {
        const importPath = `./plugins/${relativePath}`;
        return wrapRequire(id, importPath);
    });

    const optionalImports = options.lazyOptional
        ? optionalPlugins.map(({ id, relativePath }) => {
            const importPath = `./plugins/${relativePath}`;
            return wrapImport(id, importPath);
        })
        : optionalPlugins.map(({ id, relativePath }) => {
            const importPath = `./plugins/${relativePath}`;
            return wrapGetter(id, importPath);
        });

    // Metadata for all plugins (lightweight, no module evaluation)
    const metadataEntries = [];
    for (const plugin of plugins) {
        const meta = await extractPluginMetadata(plugin.fullPath);
        if (meta) {
            metadataEntries.push(`    "${plugin.id}": ${JSON.stringify(meta)},`);
        }
    }

    const metadataBlock = metadataEntries.length > 0
        ? `export var pluginMetadata = {\n${metadataEntries.join("\n")}\n};`
        : "export var pluginMetadata = {};";

    const idsBlock = `export var pluginIds = [${plugins.map(p => `"${p.id}"`).join(", ")}];`;

    return `
// Auto-generated plugin imports
${metadataBlock}
${idsBlock}

// Core plugins — eagerly loaded on init
export var corePlugins = {
${coreImports.join("\n")}
};

// Optional plugins — lazily loaded on first access
export var optionalPlugins = {
${optionalImports.join("\n")}
};

export default {
    ...corePlugins,
    ...optionalPlugins,
};
    `.trim();
}

export function pluginsImporterPlugin(options = {}) {
    return {
        name: "rain-plugins-importer",
        //@ts-ignore
        setup(build) {
            //@ts-ignore
            build.onResolve({ filter: /^#rain-plugins$/ }, args => {
                return {
                    path: path.join(projectRoot, "src/plugins"),
                    namespace: "rain-plugins-importer",
                };
            });

            //@ts-ignore
            build.onLoad({ filter: /.*/, namespace: "rain-plugins-importer" }, async () => {
                return {
                    contents: await makeModule(options),
                    loader: "ts",
                    resolveDir: path.join(projectRoot, "src"),
                };
            });
        },
    };
}
