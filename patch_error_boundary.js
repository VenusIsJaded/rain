const fs = require('fs');
let path = 'src/plugins/_core/errorboundary/ErrorBoundaryScreen.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'const { safeMode, updateSettings } = useSettings();',
    'const safeMode = useSettings(s => s.safeMode);\n    const updateSettings = useSettings(s => s.updateSettings);'
);

fs.writeFileSync(path, code);
