const fs = require('fs');

let path = 'src/plugins/platformindicators/index.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'import { findByNameLazy, findByPropsLazy, findByTypeName, findByTypeNameAll } from "@metro";',
    'import { findByNameLazy, findByPropsLazy, findByTypeNameLazy, findByTypeNameAll } from "@metro";'
);

code = code.replace(
    'findByName("ChannelHeader", false)',
    'findByNameLazy("ChannelHeader", false)'
);

code = code.replace(
    'const UserProfileContent = findByTypeName("UserProfileContent");',
    'const UserProfileContent = findByTypeNameLazy("UserProfileContent");'
);

code = code.replace(
    'const MessagesItemChannelContent = findByTypeName("MessagesItemChannelContent");',
    'const MessagesItemChannelContent = findByTypeNameLazy("MessagesItemChannelContent");'
);

fs.writeFileSync(path, code);
