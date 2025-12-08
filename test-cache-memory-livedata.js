const { createCache } = require('cache-manager');

async function testCacheMemory() {
  console.log('=== Test Memory Usage for Livestream Award Data Cache ===\n');

  // Get initial memory usage
  const initialMemory = process.memoryUsage();
  console.log('Initial Memory Usage:');
  console.log(`  Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB\n`);

  // Create cache with memory store (cache-manager v7 API)
  const cache = createCache({
    ttl: 0, // no expiration for testing
  });

  const NUM_ENTRIES = 10000;

  // Sample data structure (as provided)
  const createSampleData = (id) => ({
    id,
    masterId: 11111,
    title: 'X'.repeat(255), // 255 characters
    description: 'X'.repeat(5000), // ~5000 characters (as in example)
    statusType: 1,
    startedAt: 111111111111,
    chatRoomArn: 'arn:aws:ivschat:ap-northeast-1:751185575196:room/ZslKV2Wwk8jP',
    isViewer: true,
    isPurchased: true,
    isViewSlotFull: true,
    isPublic: true,
    user: {
      id: 110001,
      isoName: 'JP',
      nickName: 'X'.repeat(30), // 30 characters
      detailUrl: '/users/110001',
      isGgjCertificationDeveloper: true,
    },
  });

  console.log(`Creating ${NUM_ENTRIES.toLocaleString()} cache entries...`);
  console.log(`Key pattern: livestream:award:data:<live_id>`);
  console.log(`Value structure: { id, masterId, title(255), description(5000), statusType, startedAt, chatRoomArn, isViewer, isPurchased, isViewSlotFull, isPublic, user: {...} }\n`);

  const startTime = Date.now();

  // Create entries
  const promises = [];
  for (let i = 0; i < NUM_ENTRIES; i++) {
    const liveId = String(1000 + i); // 4 digits: 1000 - 10999
    const key = `livestream:award:data:${liveId}`;
    const value = createSampleData(i);
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
  const perEntryHeap = heapDiff / NUM_ENTRIES;
  const perEntryRss = rssDiff / NUM_ENTRIES;

  console.log('=== Per Entry Memory ===');
  console.log(`  Heap per entry: ${perEntryHeap.toFixed(2)} bytes`);
  console.log(`  RSS per entry: ${perEntryRss.toFixed(2)} bytes\n`);

  // Test read performance
  console.log('Testing read performance...');
  const readStart = Date.now();
  for (let i = 0; i < NUM_ENTRIES; i++) {
    const liveId = String(1000 + i);
    const key = `livestream:award:data:${liveId}`;
    await cache.get(key);
  }
  const readEnd = Date.now();
  console.log(`Time to read all ${NUM_ENTRIES.toLocaleString()} entries: ${readEnd - readStart}ms`);
  console.log(`Average read time: ${((readEnd - readStart) / NUM_ENTRIES).toFixed(4)}ms per entry\n`);

  // Sample key-value
  const sampleKey = `livestream:award:data:1500`;
  const sampleValue = await cache.get(sampleKey);
  console.log('=== Sample Entry ===');
  console.log(`Key: ${sampleKey}`);
  console.log(`Value (truncated): { id: ${sampleValue.id}, masterId: ${sampleValue.masterId}, title: "${sampleValue.title.substring(0, 20)}...", description: "${sampleValue.description.substring(0, 20)}...(${sampleValue.description.length} chars)", ... }\n`);

  // Calculate theoretical size
  const sampleKeySize = Buffer.byteLength(sampleKey, 'utf8');
  const sampleValueJson = JSON.stringify(sampleValue);
  const sampleValueSize = Buffer.byteLength(sampleValueJson, 'utf8');

  console.log('=== Theoretical Size (raw data only) ===');
  console.log(`  Key size: ${sampleKeySize} bytes`);
  console.log(`  Value JSON size: ${sampleValueSize} bytes (${(sampleValueSize / 1024).toFixed(2)} KB)`);
  console.log(`  Total per entry (raw): ${sampleKeySize + sampleValueSize} bytes (${((sampleKeySize + sampleValueSize) / 1024).toFixed(2)} KB)`);
  console.log(`  Total for ${NUM_ENTRIES.toLocaleString()} entries (raw): ${((sampleKeySize + sampleValueSize) * NUM_ENTRIES / 1024 / 1024).toFixed(2)} MB\n`);

  // Breakdown of value size
  console.log('=== Value Size Breakdown ===');
  console.log(`  title (${sampleValue.title.length} chars): ${Buffer.byteLength(sampleValue.title, 'utf8')} bytes`);
  console.log(`  description (${sampleValue.description.length} chars): ${Buffer.byteLength(sampleValue.description, 'utf8')} bytes`);
  console.log(`  chatRoomArn: ${Buffer.byteLength(sampleValue.chatRoomArn, 'utf8')} bytes`);
  console.log(`  user.nickName (${sampleValue.user.nickName.length} chars): ${Buffer.byteLength(sampleValue.user.nickName, 'utf8')} bytes\n`);

  console.log('=== Summary ===');
  console.log(`Total entries: ${NUM_ENTRIES.toLocaleString()}`);
  console.log(`Actual memory used (heap): ~${(heapDiff / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Raw data size: ~${((sampleKeySize + sampleValueSize) * NUM_ENTRIES / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Overhead factor: ${(heapDiff / ((sampleKeySize + sampleValueSize) * NUM_ENTRIES)).toFixed(2)}x (vs raw data)`);
}

testCacheMemory().catch(console.error);
