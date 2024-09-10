const path = require('path');

module.exports = {
    launch: {
        headless: false,
        args: [
            `--disable-extensions-except=${path.join(__dirname, 'dist')}`,
            `--load-extension=${path.join(__dirname, 'dist')}`,
        ],
    },
};