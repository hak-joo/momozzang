const path = require('path');

module.exports = {
  plugins: {
    'postcss-mixins': {
      mixinsFiles: [
        path.resolve(__dirname, '..', '..', 'packages/ui/src/shared/styles/typography.css'),
      ],
    },
  },
};
