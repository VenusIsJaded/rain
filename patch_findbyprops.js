const fs = require('fs');

function patchFile(filePath, replacer) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');
    const newCode = replacer(code);
    if (newCode !== code) {
        fs.writeFileSync(filePath, newCode);
        console.log(`Patched ${filePath}`);
    }
}

patchFile('src/plugins/_core/rainenhancements/notrack/index.ts', code => {
    let p = code.replace('import { findByProps } from "@metro";', 'import { findByPropsLazy } from "@metro";');
    p = p.replace('initializer: findByProps("initSentry"),', 'initializer: findByPropsLazy("initSentry"),');
    p = p.replace('const clientModUtils = findByProps("usesClientMods");', 'const clientModUtils = findByPropsLazy("usesClientMods");');
    return p;
});

patchFile('src/plugins/customVoiceMessages/patches/download.tsx', code => {
    let p = code.replace('import { findByProps } from "@metro";', 'import { findByPropsLazy } from "@metro";');
    p = p.replace('await findByProps("downloadMediaAsset").downloadMediaAsset(', 'await findByPropsLazy("downloadMediaAsset").downloadMediaAsset(');
    return p;
});

patchFile('src/plugins/hiddenchannels/index.ts', code => {
    let p = code.replace('const transitionToGuild = findByProps("transitionToGuild");', 'const transitionToGuild = findByPropsLazy("transitionToGuild");');
    return p;
});

patchFile('src/plugins/multiscrobbler/ui/pages/pages/components/TableComponents.tsx', code => {
    let p = code.replace('} = findByProps(', '} = findByPropsLazy(');
    return p;
});

patchFile('src/plugins/reviewdb/components/ActionSheet.tsx', code => {
    let p = code.replace('findByProps("ActionSheet")?.ActionSheet ??', 'findByPropsLazy("ActionSheet")?.ActionSheet ??');
    return p;
});

patchFile('src/plugins/reviewdb/lib/redesign.ts', code => {
    let p = code.replace('import { findByProps } from "@metro";', 'import { findByPropsLazy } from "@metro";');
    p = p.replace('findByProps(...props)', 'findByPropsLazy(...props)');
    return p;
});

patchFile('src/plugins/tokenutilities/index.ts', code => {
    let p = code.replace('await findByProps(', 'await findByPropsLazy(');
    return p;
});

