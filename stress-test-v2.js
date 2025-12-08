const axios = require('axios');
const { writeFileSync } = require('fs');
const { performance } = require('perf_hooks');

// Configuration
const config = {
  url: 'http://localhost:8911/api/ggj/v1/surface/watch-live/5/status',
  connections: 400, // Number of concurrent connections
  duration: 60, // Duration of the test in seconds
  headers: {
    'Cookie': 'livestream:vk:5=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjY0MDkyNSwibGl2ZVN0cmVhbUlkIjo1LCJpYXQiOjE3NTA4MjQ4NTgsImV4cCI6MTc4MjM4MjQ1OH0.VpJ6vytXb-BcgS2YjP6wIrLUQQtFbS-iCvSybM8Tv7U',
    'Content-Type': 'application/json',
    'au-payload': '{"userId": 640925}',
  }
};

// Metrics
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    invalid: 0
  },
  latency: {
    values: [],
    min: Number.MAX_SAFE_INTEGER,
    max: 0,
    average: 0
  },
  errors: {},
  candidateErrorResponses: []
};

// Make a single request and track metrics
async function makeRequest() {
  const startTime = performance.now();
  let responseStatus = 0;
  let response = null;
  try {
    metrics.requests.total++;
    response = await axios.get(config.url, { headers: config.headers });
    responseStatus = response.status;
    const endTime = performance.now();
    const latency = endTime - startTime;
    
    // Update latency metrics
    metrics.latency.values.push(latency);
    metrics.latency.min = Math.min(metrics.latency.min, latency);
    metrics.latency.max = Math.max(metrics.latency.max, latency);
    
    // Check response
    if (responseStatus >= 400) {
      metrics.requests.failed++;
      console.log(`Warning: Status code is not 200: ${responseStatus}`);
      
      if (!metrics.invalid[responseStatus]) {
        metrics.invalid[responseStatus] = 0;
      }
      metrics.invalid[responseStatus]++;
    } else {
      metrics.requests.successful++;
      
      // if (response.data < 900) {
      //   console.log('Warning: Missing or empty playbackUrl in response:', response.data);
      // }
    }
  } catch (error) {
    metrics.requests.failed++;
    const errorMessage = error.response ? `Status ${error.response.status}` : error.message;
    
    if (!metrics.errors[errorMessage]) {
      metrics.errors[errorMessage] = 0;
    }
    metrics.errors[errorMessage]++;
    
    if (errorMessage === '' && !metrics.candidateErrorResponses.length){
      metrics.candidateErrorResponses.push(error);
    }

    const endTime = performance.now();
    const latency = endTime - startTime;
    metrics.latency.values.push(latency);
  }
}

// Run multiple requests concurrently
async function runBatch(batchSize) {
  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    promises.push(makeRequest());
  }
  await Promise.all(promises);
}

// Main stress test function
async function runStressTest() {
  console.log(`Starting stress test for ${config.url}`);
  console.log(`Concurrent connections: ${config.connections}`);
  console.log(`Test duration: ${config.duration} seconds`);
  
  const startTime = performance.now();
  const endTime = startTime + (config.duration * 1000);
  
  // Run batches until duration is reached
  // while (performance.now() < endTime) {
    await runBatch(config.connections); // Process in smaller batches to avoid overwhelming the system
    
    // Print progress
    const elapsedSeconds = (performance.now() - startTime) / 1000;
    const requestsPerSecond = metrics.requests.total / elapsedSeconds;
    process.stdout.write(`\rRequests: ${metrics.requests.total}, Rate: ${requestsPerSecond.toFixed(2)} req/sec`);
  // }
  
  // Calculate final metrics
  metrics.latency.average = metrics.latency.values.reduce((sum, val) => sum + val, 0) / metrics.latency.values.length;
  
  // Calculate throughput
  const totalDuration = (performance.now() - startTime) / 1000;
  const throughput = metrics.requests.total / totalDuration;
  
  const results = {
    url: config.url,
    duration: totalDuration,
    connections: config.connections,
    requests: metrics.requests,
    latency: {
      min: metrics.latency.min,
      max: metrics.latency.max,
      average: metrics.latency.average
    },
    throughput: throughput,
    errors: metrics.errors,
    invalid: metrics.invalid,
    candidateErrorResponses: metrics.candidateErrorResponses
  };
  
  // Write results to file
  writeFileSync(
    `watch-live-status-results-axios-${new Date().toISOString().replace(/:/g, '-')}.json`,
    JSON.stringify(results, null, 2)
  );
  
  // Display summary
  console.log('\nStress test completed!');
  console.log('Summary:');
  console.log(`Requests: ${results.requests.total} (${results.requests.successful} successful, ${results.requests.failed} failed)`);
  console.log(`Throughput: ${results.throughput.toFixed(2)} req/sec`);
  console.log(`Latency (avg): ${results.latency.average.toFixed(2)} ms`);
  console.log(`Latency (min): ${results.latency.min.toFixed(2)} ms`);
  console.log(`Latency (max): ${results.latency.max.toFixed(2)} ms`);
  console.log(`Errors:`, results.errors);
  console.log(`Invalid:`, results.invalid);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nTest interrupted by user');
  process.exit(0);
});

// Run the stress test
runStressTest().catch(err => {
  console.error('Error running stress test:', err);
  process.exit(1);
}); 