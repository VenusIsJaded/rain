const fs = require('fs');

let path = 'src/rain/pages/Developer/index.tsx';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
    'const loaderConfig = useLoaderConfig();',
    'const customLoadUrl = useLoaderConfig(s => s.customLoadUrl);\n    const updateLoaderConfig = useLoaderConfig(s => s.updateLoaderConfig);\n    const loadReactDevTools = useLoaderConfig(s => s.loadReactDevTools);\n    const usePrereleases = useLoaderConfig(s => s.usePrereleases);'
);
code = code.replace(/loaderConfig\.updateLoaderConfig/g, 'updateLoaderConfig');
code = code.replace(/loaderConfig\.customLoadUrl/g, 'customLoadUrl');
code = code.replace(/loaderConfig\.loadReactDevTools/g, 'loadReactDevTools');
code = code.replace(/loaderConfig\.usePrereleases/g, 'usePrereleases');
fs.writeFileSync(path, code);

path = 'src/rain/pages/Updater/index.tsx';
code = fs.readFileSync(path, 'utf8');
code = code.replace(
    'const loaderConfig = useLoaderConfig();',
    'const usePrereleases = useLoaderConfig(s => s.usePrereleases);\n    const updateLoaderConfig = useLoaderConfig(s => s.updateLoaderConfig);'
);
code = code.replace(/loaderConfig\.usePrereleases/g, 'usePrereleases');
code = code.replace(/loaderConfig\.updateLoaderConfig/g, 'updateLoaderConfig');
fs.writeFileSync(path, code);

