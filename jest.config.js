module.exports = {
    preset: 'jest-puppeteer',
    testMatch: ['**/tests/**/*.test.js'],
    setupFilesAfterEnv: ['./jest.setup.js'],
    testEnvironment: 'node'
};