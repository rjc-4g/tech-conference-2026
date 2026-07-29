module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
    verbose: true,
    testTimeout: 10000
}
