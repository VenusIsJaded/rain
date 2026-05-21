const fs = require('fs');
let path = 'src/plugins/taptap/settings.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'const { developerSettings } = useSettings();',
    'const developerSettings = useSettings(s => s.developerSettings);'
);

fs.writeFileSync(path, code);
