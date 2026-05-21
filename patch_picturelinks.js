const fs = require('fs');

let path = 'src/plugins/picturelinks/index.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'for (const unpatch of patches) unpatch();',
    'for (const unpatch of patches) unpatch();\n        patches.length = 0;'
);

fs.writeFileSync(path, code);
