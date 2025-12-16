// Polyfill for Node.js v22 compatibility with jest-expo
// This must run before jest-expo setup

// Store the original Object.defineProperty
const originalDefineProperty = Object.defineProperty;

// Create a safer version that checks if the first argument is an object
const safeDefineProperty = function (obj, prop, descriptor) {
  // If obj is not an object or is null/undefined, return obj without error
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Check if obj is a primitive that can't have properties defined
  const objType = typeof obj;
  if (objType !== 'object' && objType !== 'function') {
    // For primitives, just return the value
    return obj;
  }

  try {
    // Otherwise, call the original function
    return originalDefineProperty.call(Object, obj, prop, descriptor);
  } catch (error) {
    // If it still fails, log and return obj
    console.warn(`Object.defineProperty failed for:`, obj, prop, error.message);
    return obj;
  }
};

// Replace Object.defineProperty globally
Object.defineProperty = safeDefineProperty;

// Ensure the function has the same properties as the original
Object.setPrototypeOf(safeDefineProperty, originalDefineProperty);
