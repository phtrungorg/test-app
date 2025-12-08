const { createCache } = require('cache-manager');

async function testCacheMemory() {
  console.log('=== Test Memory Usage for 10,000 User Cache ===\n');

  // Get initial memory usage
  const initialMemory = process.memoryUsage();
  console.log('Initial Memory Usage:');
  console.log(`  Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB\n`);

  // Create cache with memory store (cache-manager v7 API)
  const cache = createCache({
    ttl: 0, // no expiration for testing
  });

  const NUM_USERS = 10000;
  const liveId = '1234'; // 4 digits

  console.log(`Creating ${NUM_USERS.toLocaleString()} cache entries...`);
  console.log(`Key pattern: livestream:award:viewer-data:${liveId}:<userId>`);
  console.log(`Value: {isLiked: 1, isDisliked: 1, isChatMuted: 1, communityMemberStatusType: 3}\n`);

  const startTime = Date.now();

  // Create 10,000 entries
  const promises = [];
  for (let i = 0; i < NUM_USERS; i++) {
    const userId = String(100000 + i); // 6 digits: 100000 - 109999
    const key = `livestream:award:viewer-data:${liveId}:${userId}`;
    const value = {
      isLiked: 1,
      isDisliked: 1,
      isChatMuted: 1,
      communityMemberStatusType: 3,
    };
    promises.push(cache.set(key, value));
  }

  await Promise.all(promises);

  const endTime = Date.now();
  console.log(`Time to insert: ${endTime - startTime}ms\n`);

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log('Garbage collection triggered\n');
  }

  // Get final memory usage
  const finalMemory = process.memoryUsage();
  console.log('Final Memory Usage:');
  console.log(`  Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB\n`);

  // Calculate difference
  const heapDiff = finalMemory.heapUsed - initialMemory.heapUsed;
  const rssDiff = finalMemory.rss - initialMemory.rss;

  console.log('=== Memory Difference ===');
  console.log(`  Heap Used Delta: ${(heapDiff / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  RSS Delta: ${(rssDiff / 1024 / 1024).toFixed(2)} MB\n`);

  // Calculate per-entry memory
  const perEntryHeap = heapDiff / NUM_USERS;
  const perEntryRss = rssDiff / NUM_USERS;

  console.log('=== Per Entry Memory ===');
  console.log(`  Heap per entry: ${perEntryHeap.toFixed(2)} bytes`);
  console.log(`  RSS per entry: ${perEntryRss.toFixed(2)} bytes\n`);

  // Test read performance
  console.log('Testing read performance...');
  const readStart = Date.now();
  for (let i = 0; i < NUM_USERS; i++) {
    const userId = String(100000 + i);
    const key = `livestream:award:viewer-data:${liveId}:${userId}`;
    await cache.get(key);
  }
  const readEnd = Date.now();
  console.log(`Time to read all ${NUM_USERS.toLocaleString()} entries: ${readEnd - readStart}ms`);
  console.log(`Average read time: ${((readEnd - readStart) / NUM_USERS).toFixed(4)}ms per entry\n`);

  // Sample key-value
  const sampleKey = `livestream:award:viewer-data:${liveId}:100500`;
  const sampleValue = await cache.get(sampleKey);
  console.log('=== Sample Entry ===');
  console.log(`Key: ${sampleKey}`);
  console.log(`Value: ${JSON.stringify(sampleValue)}\n`);

  // Calculate theoretical size
  const sampleKeySize = Buffer.byteLength(sampleKey, 'utf8');
  const sampleValueSize = Buffer.byteLength(JSON.stringify(sampleValue), 'utf8');
  console.log('=== Theoretical Size (raw data only) ===');
  console.log(`  Key size: ${sampleKeySize} bytes`);
  console.log(`  Value JSON size: ${sampleValueSize} bytes`);
  console.log(`  Total per entry (raw): ${sampleKeySize + sampleValueSize} bytes`);
  console.log(`  Total for ${NUM_USERS.toLocaleString()} entries (raw): ${((sampleKeySize + sampleValueSize) * NUM_USERS / 1024 / 1024).toFixed(2)} MB\n`);

  console.log('=== Summary ===');
  console.log(`Total entries: ${NUM_USERS.toLocaleString()}`);
  console.log(`Actual memory used: ~${(heapDiff / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Overhead factor: ${(heapDiff / ((sampleKeySize + sampleValueSize) * NUM_USERS)).toFixed(2)}x (vs raw data)`);
}

testCacheMemory().catch(console.error);
