/** @type {import('jest').Config} */
const config = {
  // Dùng jsdom để giả lập browser cho component tests
  testEnvironment: "jest-environment-jsdom",

  // Load global setup (jest-dom matchers, env vars)
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Hỗ trợ ES Module import (Next.js dùng ESM)
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },

  // Map alias @/ → root (khớp jsconfig.json của project)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // Bỏ qua file CSS/image trong component tests
    "\\.(css|less|scss|sass)$": "<rootDir>/__tests__/__mocks__/styleMock.js",
    "\\.(jpg|jpeg|png|gif|svg|webp)$": "<rootDir>/__tests__/__mocks__/fileMock.js",
  },

  // Chỉ chạy file test trong __tests__/, bỏ qua .next/ và node_modules/
  testMatch: ["<rootDir>/__tests__/**/*.test.{js,jsx}"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],

  // Hiển thị coverage khi chạy npm run test:coverage
  collectCoverageFrom: [
    "pages/api/**/*.js",
    "app/utils/**/*.js",
    "lib/normalizer.js",
    "lib/apiClient.js",
    "components/MinPriceBox.jsx",
    "components/TrendingDeals.jsx",
    "components/HeroSearch.jsx",
    "components/SearchCard.jsx",
    "!pages/api/database.js",
    "!pages/api/auth/[...nextauth].js",
  ],
};

module.exports = config;
