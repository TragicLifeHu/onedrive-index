const path = require('path')
module.exports = {
  reactStrictMode: true,
  // Transpile ESM packages for proper module resolution
  transpilePackages: ['plyr', 'plyr-react', 'react-doc-viewer'],
}