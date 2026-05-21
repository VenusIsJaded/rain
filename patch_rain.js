const fs = require('fs');
let path = 'src/rain/pages/Rain/index.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'const { developerSettings, safeMode, updateSettings } = useSettings();',
    'const developerSettings = useSettings(s => s.developerSettings);\n    const safeMode = useSettings(s => s.safeMode);\n    const updateSettings = useSettings(s => s.updateSettings);'
);

fs.writeFileSync(path, code);
