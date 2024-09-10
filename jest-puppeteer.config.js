const path = require('path');

module.exports = {
    launch: {
        headless: process.env.CI === 'true' ? 'new' : false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            `--disable-extensions-except=${path.join(__dirname, 'dist')}`,
            `--load-extension=${path.join(__dirname, 'dist')}`,
        ],
    },
};