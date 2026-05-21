const fs = require('fs');
let path = 'src/rain/pages/Plugins/models/rain.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'usePluginState() {\n            usePluginSettings(state => state.settings);\n        },',
    'usePluginState() {\n            usePluginSettings(state => state.settings[manifest.id]);\n        },'
);

fs.writeFileSync(path, code);

path = 'src/rain/pages/Plugins/sheets/PluginInfoActionSheet.tsx';
code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'const { pinnedPlugins, togglePinnedPlugin } = useSettings();',
    'const pinnedPlugins = useSettings(s => s.pinnedPlugins);\n    const togglePinnedPlugin = useSettings(s => s.togglePinnedPlugin);'
);

fs.writeFileSync(path, code);
