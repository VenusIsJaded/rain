const fs = require('fs');

let path = 'src/plugins/customEffects/patches/profile.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace('import { findByProps } from "@metro";', 'import { findByPropsLazy } from "@metro";');
code = code.replace('findByProps("getUserProfile")', 'findByPropsLazy("getUserProfile")');
code = code.replace('findByProps("getProfileEffect")', 'findByPropsLazy("getProfileEffect")');
code = code.replace('findByProps("getProfileEffect")', 'findByPropsLazy("getProfileEffect")');

fs.writeFileSync(path, code);

path = 'src/plugins/customEffects/index.ts';
code = fs.readFileSync(path, 'utf8');

code = code.replace(
    '        patchGetUserProfile();\n        patchGetAllProfileEffects();\n        patchGetProfileEffect();',
    '        this.unpatches = [\n            patchGetUserProfile(),\n            patchGetAllProfileEffects(),\n            patchGetProfileEffect()\n        ];'
);
code = code.replace('    stop() {},', '    stop() {\n        this.unpatches?.forEach(u => u());\n    },');

fs.writeFileSync(path, code);
