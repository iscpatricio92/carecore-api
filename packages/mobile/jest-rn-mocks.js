// Mock React Native modules for testing
// This file should be loaded before jest-setup.js

// Mock the batched bridge
global.__fbBatchedBridgeConfig = {
  remoteModuleConfig: [],
  localModulesConfig: [],
};

// Mock NativeModules
jest.mock('react-native/Libraries/BatchedBridge/NativeModules', () => ({
  UIManager: {
    RCTView: () => {},
  },
  PlatformConstants: {
    forceTouchAvailable: false,
  },
  RNGestureHandlerModule: {
    attachGestureHandler: jest.fn(),
    createGestureHandler: jest.fn(),
    dropGestureHandler: jest.fn(),
    updateGestureHandler: jest.fn(),
    State: {},
    Directions: {},
  },
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: (objs) => objs.ios,
  isTesting: true,
}));

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 667, scale: 2, fontScale: 1 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock PixelRatio
jest.mock('react-native/Libraries/Utilities/PixelRatio', () => ({
  get: jest.fn(() => 2),
  getFontScale: jest.fn(() => 1),
  getPixelSizeForLayoutSize: jest.fn((layoutSize) => Math.round(layoutSize * 2)),
  roundToNearestPixel: jest.fn((layoutSize) => {
    const ratio = 2;
    return Math.round(layoutSize * ratio) / ratio;
  }),
}));

// Mock Animated
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
