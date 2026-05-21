const fs = require('fs');

let path = 'src/plugins/reviewdb/patches/patchProfile.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'import { findByTypeName } from "@metro";',
    'import { findByTypeNameLazy } from "@metro";'
);
code = code.replace(
    'let UserProfile = findByTypeName("UserProfile");',
    'let UserProfile = findByTypeNameLazy("UserProfile");'
);
code = code.replace(
    'UserProfile = findByTypeName("UserProfileContent");',
    'UserProfile = findByTypeNameLazy("UserProfileContent");'
);
fs.writeFileSync(path, code);


path = 'src/plugins/reviewdb/patches/patchSimplifiedProfile.ts';
code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'import { findByTypeName } from "@metro";',
    'import { findByTypeNameLazy } from "@metro";'
);
code = code.replace(
    'const SimplifiedUserProfileContent = findByTypeName(',
    'const SimplifiedUserProfileContent = findByTypeNameLazy('
);
fs.writeFileSync(path, code);

