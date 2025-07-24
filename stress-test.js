const autocannon = require('autocannon');
const { writeFileSync } = require('fs');
const AWS_ACCESS_KEY_ID = 'AKIAVJWJ666666666666';
const AWS_SECRET_ACCESS_KEY = '6666666666666666666666666666666666666666';
const AWS_REGION = 'ap-northeast-1';
// Configuration
const config = {
  url: 'http://localhost:8911/api/ggj/v1/surface/watch-live/5/status', // Replace with your actual endpoint URL and ID
  connections: 5000, // Number of concurrent connections
  duration: 60, // Duration of the test in seconds
  pipelining: 1, // Number of pipelined requests
  headers: {
    'Cookie': 'livestream:vk:5=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjY0MDkyNSwibGl2ZVN0cmVhbUlkIjo1LCJpYXQiOjE3NTA4MjQ4NTgsImV4cCI6MTc4MjM4MjQ1OH0.VpJ6vytXb-BcgS2YjP6wIrLUQQtFbS-iCvSybM8Tv7U',
    'Content-Type': 'application/json',
		'au-payload': '{"userId": 640925}',
  },
  setupClient: (client) => {
    client.on('response', (statusCode, resBytes, responseTime) => {
      try {
        const responseBody = resBytes.toString();
        const parsedResponse = JSON.parse(responseBody);
        
        if (statusCode >= 400) {
          console.log('Warning: Status code is not 200:', statusCode);
        }

        // if (parsedResponse < 900) {
        //   console.log('Warning: Missing or empty playbackUrl in response:', parsedResponse);
        // }
      } catch (error) {
        console.error('Error parsing response:', error.message);
      }
    });
  }
};

console.log(`Starting stress test for ${config.url}`);
console.log(`Concurrent connections: ${config.connections}`);
console.log(`Test duration: ${config.duration} seconds`);

// Run the stress test
const instance = autocannon(config);

// Track progress
autocannon.track(instance, { renderProgressBar: true });

// Save results to file when done
instance.on('done', (results) => {
  console.log('Stress test completed!');
  
  // Write results to JSON file
  writeFileSync(
    `watch-live-status-results-${new Date().toISOString().replace(/:/g, '-')}.json`,
    JSON.stringify(results, null, 2)
  );
  
  // Display summary
  console.log('Summary:');
  console.log(`Requests: ${results.requests.total}`);
  console.log(`Throughput: ${results.throughput.average.toFixed(2)} req/sec`);
  console.log(`Latency (avg): ${results.latency.average.toFixed(2)} ms`);
  console.log(`Latency (max): ${results.latency.max} ms`);
  console.log(`Errors: ${results.errors}`);
});

// Handle process termination
process.once('SIGINT', () => {
  instance.stop();
});