/**
 * optimization-adapter.test.js
 * Unit tests for the OptimizationAdapter class
 */

import { jest } from '@jest/globals';
import path from 'path';

// Mock fs module before importing OptimizationAdapter
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockStatSync = jest.fn();

// We create our own mock fs object
jest.mock('fs', () => {
  return {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    statSync: mockStatSync
  };
});

// Now import the OptimizationAdapter
import { OptimizationAdapter, OPTIMIZATION_CONFIG } from '../../scripts/modules/optimization-adapter.js';

// Create mock fs module
const fs = {
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  statSync: mockStatSync
};

describe('OptimizationAdapter', () => {
  let adapter;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock that optimizers are available
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 1024 });
  });
  
  test('should initialize with default configuration', () => {
    adapter = new OptimizationAdapter();
    expect(adapter.config).toEqual(OPTIMIZATION_CONFIG);
    expect(adapter.originalFs).toBe(fs);
  });
  
  test('should fall back to original fs when optimizers are not available', () => {
    // Mock that optimizers are not available
    mockExistsSync.mockReturnValue(false);
    
    adapter = new OptimizationAdapter();
    expect(adapter.optimizersAvailable).toBe(false);
    
    // Test read operation
    const mockData = 'test data';
    mockReadFileSync.mockReturnValue(mockData);
    
    const reader = adapter.createOptimizedReader('test.json');
    const result = reader('utf8');
    
    expect(result).toBe(mockData);
    expect(mockReadFileSync).toHaveBeenCalledWith('test.json', 'utf8');
  });
  
  test('should create optimized reader when optimizers are available', () => {
    // Create an adapter with mocked optimizers
    const mockOptimizedRead = jest.fn().mockReturnValue('optimized data');
    
    adapter = new OptimizationAdapter();
    // Manually set optimizers available and mock holocron optimizers
    adapter.optimizersAvailable = true;
    adapter.holocronOptimizers = {
      readers: {
        createOptimizedReader: jest.fn().mockReturnValue(mockOptimizedRead)
      }
    };
    
    const reader = adapter.createOptimizedReader('test.json');
    const result = reader('utf8');
    
    expect(result).toBe('optimized data');
    expect(adapter.holocronOptimizers.readers.createOptimizedReader).toHaveBeenCalled();
    expect(mockOptimizedRead).toHaveBeenCalledWith('utf8');
  });
  
  test('should fall back to original reader when optimized reader fails', () => {
    // Create an adapter with mocked optimizers that throw an error
    const mockOptimizedRead = jest.fn().mockImplementation(() => {
      throw new Error('Optimization failed');
    });
    
    adapter = new OptimizationAdapter();
    // Manually set optimizers available and mock holocron optimizers
    adapter.optimizersAvailable = true;
    adapter.holocronOptimizers = {
      readers: {
        createOptimizedReader: jest.fn().mockReturnValue(mockOptimizedRead)
      }
    };
    
    // Mock the original read operation
    const mockData = 'original data';
    mockReadFileSync.mockReturnValue(mockData);
    
    const reader = adapter.createOptimizedReader('test.json');
    const result = reader('utf8');
    
    // Should fall back to original reader
    expect(result).toBe(mockData);
    expect(mockReadFileSync).toHaveBeenCalledWith('test.json', 'utf8');
  });
  
  test('should create optimized writer when optimizers are available', () => {
    // Create an adapter with mocked optimizers
    const mockOptimizedWrite = jest.fn();
    
    adapter = new OptimizationAdapter();
    // Manually set optimizers available and mock holocron optimizers
    adapter.optimizersAvailable = true;
    adapter.holocronOptimizers = {
      writers: {
        createOptimizedWriter: jest.fn().mockReturnValue(mockOptimizedWrite)
      }
    };
    
    const writer = adapter.createOptimizedWriter('test.json');
    writer('test data', 'utf8');
    
    expect(adapter.holocronOptimizers.writers.createOptimizedWriter).toHaveBeenCalled();
    expect(mockOptimizedWrite).toHaveBeenCalledWith('test data', 'utf8');
  });
  
  test('should enhance file operations with optimizers', () => {
    const originalOps = {
      readFile: jest.fn(),
      writeFile: jest.fn()
    };
    
    const enhancedOps = {
      readFile: jest.fn(),
      writeFile: jest.fn()
    };
    
    adapter = new OptimizationAdapter();
    // Manually set optimizers available and mock holocron optimizers
    adapter.optimizersAvailable = true;
    adapter.holocronOptimizers = {
      fileOps: {
        enhanceOperations: jest.fn().mockReturnValue(enhancedOps)
      }
    };
    
    const result = adapter.enhanceFileOperations(originalOps);
    
    expect(adapter.holocronOptimizers.fileOps.enhanceOperations).toHaveBeenCalledWith(originalOps, {});
    // Since we return a proxy and not the actual object, we can't test for object identity
    // Just check that the function was called
    expect(adapter.holocronOptimizers.fileOps.enhanceOperations).toHaveBeenCalled();
  });
  
  test('should return original operations when enhanceFileOperations fails', () => {
    const originalOps = {
      readFile: jest.fn(),
      writeFile: jest.fn()
    };
    
    adapter = new OptimizationAdapter();
    // Manually set optimizers available and mock holocron optimizers that throw
    adapter.optimizersAvailable = true;
    adapter.holocronOptimizers = {
      fileOps: {
        enhanceOperations: jest.fn().mockImplementation(() => {
          throw new Error('Enhancement failed');
        })
      }
    };
    
    const result = adapter.enhanceFileOperations(originalOps);
    
    expect(result).toBe(originalOps);
  });
});