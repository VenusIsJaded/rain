const fs = require('fs');

let path = 'src/plugins/betterchatbuttons/index.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    /    async start\(\) \{\n(?:.*\n)*?        \}\n    \},/,
    ''
);

fs.writeFileSync(path, code);
