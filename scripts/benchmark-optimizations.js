/**
 * benchmark-optimizations.js
 * Benchmarking script for OptimizationAdapter performance improvements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { OptimizationAdapter } from './modules/optimization-adapter.js';
import { log } from './modules/utils.js';

// Test file paths and sizes
const TEST_FILES = {
  small: {
    path: path.join(process.cwd(), 'tests', 'fixtures', 'small-file.json'),
    size: 1024, // 1KB
    content: JSON.stringify({ test: 'data', items: Array(10).fill('sample') })
  },
  medium: {
    path: path.join(process.cwd(), 'tests', 'fixtures', 'medium-file.json'),
    size: 1024 * 100, // 100KB
    content: JSON.stringify({ test: 'data', items: Array(1000).fill('sample') })
  },
  large: {
    path: path.join(process.cwd(), 'tests', 'fixtures', 'large-file.json'),
    size: 1024 * 1024, // 1MB
    content: JSON.stringify({ test: 'data', items: Array(10000).fill('sample') })
  }
};

// Prepare test files
function prepareTestFiles() {
  Object.values(TEST_FILES).forEach(file => {
    const dir = path.dirname(file.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file.path, file.content);
  });
}

// Clean up test files
function cleanupTestFiles() {
  Object.values(TEST_FILES).forEach(file => {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
}

// Run benchmark for read operations
async function benchmarkRead() {
  const results = {};
  const adapter = new OptimizationAdapter();
  
  for (const [size, file] of Object.entries(TEST_FILES)) {
    // Benchmark original read
    const originalStart = performance.now();
    for (let i = 0; i < 100; i++) {
      fs.readFileSync(file.path, 'utf8');
    }
    const originalEnd = performance.now();
    const originalTime = originalEnd - originalStart;
    
    // Benchmark optimized read
    const optimizedReader = adapter.createOptimizedReader(file.path);
    const optimizedStart = performance.now();
    for (let i = 0; i < 100; i++) {
      optimizedReader('utf8');
    }
    const optimizedEnd = performance.now();
    const optimizedTime = optimizedEnd - optimizedStart;
    
    // Calculate improvement
    const improvement = (originalTime / optimizedTime) * 100 - 100;
    
    results[size] = {
      originalTime,
      optimizedTime,
      improvement: `${improvement.toFixed(2)}%`
    };
  }
  
  return results;
}

// Run benchmark for write operations
async function benchmarkWrite() {
  const results = {};
  const adapter = new OptimizationAdapter();
  
  for (const [size, file] of Object.entries(TEST_FILES)) {
    // Benchmark original write
    const originalStart = performance.now();
    for (let i = 0; i < 100; i++) {
      fs.writeFileSync(file.path, file.content);
    }
    const originalEnd = performance.now();
    const originalTime = originalEnd - originalStart;
    
    // Benchmark optimized write
    const optimizedWriter = adapter.createOptimizedWriter(file.path);
    const optimizedStart = performance.now();
    for (let i = 0; i < 100; i++) {
      optimizedWriter(file.content);
    }
    const optimizedEnd = performance.now();
    const optimizedTime = optimizedEnd - optimizedStart;
    
    // Calculate improvement
    const improvement = (originalTime / optimizedTime) * 100 - 100;
    
    results[size] = {
      originalTime,
      optimizedTime,
      improvement: `${improvement.toFixed(2)}%`
    };
  }
  
  return results;
}

// Run the benchmarks
async function runBenchmarks() {
  try {
    log('info', 'Preparing test files...');
    prepareTestFiles();
    
    log('info', 'Running read benchmarks...');
    const readResults = await benchmarkRead();
    
    log('info', 'Running write benchmarks...');
    const writeResults = await benchmarkWrite();
    
    // Display results
    log('info', 'Benchmark Results:');
    log('info', 'Read Operations:');
    console.table(readResults);
    
    log('info', 'Write Operations:');
    console.table(writeResults);
    
    // Check if performance target is met (200% improvement)
    const allResults = { ...readResults, ...writeResults };
    const targetMet = Object.values(allResults).every(
      result => parseFloat(result.improvement) >= 200
    );
    
    if (targetMet) {
      log('success', 'Performance target met! All operations show at least 200% improvement.');
    } else {
      log('warn', 'Performance target not met. Some operations show less than 200% improvement.');
    }
  } catch (error) {
    log('error', 'Benchmark failed:', error.message);
    console.error(error);
  } finally {
    log('info', 'Cleaning up test files...');
    cleanupTestFiles();
  }
}

// Run benchmarks when script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBenchmarks();
}

export { runBenchmarks };