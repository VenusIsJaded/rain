const fs = require('fs');
let path = 'src/rain/pages/Developer/index.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'const settings = useSettings();',
    'const debuggerUrl = useSettings(s => s.debuggerUrl);\n    const autoDebugger = useSettings(s => s.autoDebugger);\n    const devToolsUrl = useSettings(s => s.devToolsUrl);\n    const autoDevTools = useSettings(s => s.autoDevTools);\n    const hotReloadThemeUrl = useSettings(s => s.hotReloadThemeUrl);\n    const hotReloadThemeSetting = useSettings(s => s.hotReloadTheme);\n    const disableUpdateWarnings = useSettings(s => s.disableUpdateWarnings);\n    const updateSettings = useSettings(s => s.updateSettings);'
);

code = code.replace(/settings\.updateSettings/g, 'updateSettings');
code = code.replace(/settings\.debuggerUrl/g, 'debuggerUrl');
code = code.replace(/settings\.autoDebugger/g, 'autoDebugger');
code = code.replace(/settings\.devToolsUrl/g, 'devToolsUrl');
code = code.replace(/settings\.autoDevTools/g, 'autoDevTools');
code = code.replace(/settings\.hotReloadThemeUrl/g, 'hotReloadThemeUrl');
code = code.replace(/settings\.hotReloadTheme/g, 'hotReloadThemeSetting');
code = code.replace(/settings\.disableUpdateWarnings/g, 'disableUpdateWarnings');

fs.writeFileSync(path, code);
