const fs = require('fs');
let path = 'src/plugins/_core/settings/settings.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'const { settingsPosition, pluginCard, compactMode, updateSettings } = useSettings();',
    'const settingsPosition = useSettings(s => s.settingsPosition);\n    const pluginCard = useSettings(s => s.pluginCard);\n    const compactMode = useSettings(s => s.compactMode);\n    const updateSettings = useSettings(s => s.updateSettings);'
);

fs.writeFileSync(path, code);
