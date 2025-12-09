import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const statusUpdateCounter = new Counter('status_updates');
const viewCountCounter = new Counter('view_count_updates');
const notificationCounter = new Counter('notification_requests');

// Test configuration
export const options = {
  // Scenarios for AWS DLT
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 50 },   // Ramp up to 50 over 3 minutes
        { duration: '10m', target: 50 },  // Hold at 50 for 10 minutes
        { duration: '30s', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  
  // Thresholds
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:status_update}': ['p(95)<300'],
    'http_req_duration{endpoint:view_count}': ['p(95)<400'],
    'http_req_duration{endpoint:notification}': ['p(95)<200'],
  },
  
  // Other options
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

const BASE_URL = __ENV.BASE_URL || 'https://www.gogo.gogojungle.net';
const LIVE_ID = __ENV.LIVE_ID || '1';

// Main test function
export default function () {
  // Initial headers without viewKey and slotId
  const initialHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-requested-with': 'XMLHttpRequest',
  };

  // 1. Access Page API (once per user session) to get viewerKey
  const accessRes = http.get(`${BASE_URL}/api/ggj/v1/surface/watch-live/${LIVE_ID}`, {
    headers: initialHeaders,
    tags: { endpoint: 'access_page' },
  });

  check(accessRes, {
    'access page status 200': (r) => r.status === 200,
    'access page response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Extract viewerKey from response
  let viewKey;
  try {
    const responseData = JSON.parse(accessRes.body);
    viewKey = responseData.data.viewerKey;
  } catch (e) {
    console.error('Failed to parse viewerKey from response:', e);
    return; // Exit if we can't get viewKey
  }

  // 2. Get Status to retrieve slotId
  const statusInitRes = http.get(
    `${BASE_URL}/api/ggj/v1/surface/watch-live/${LIVE_ID}/status`,
    {
      headers: {
        ...initialHeaders,
        'ggj-live-view-key': viewKey,
      },
      tags: { endpoint: 'get_status_init' }
    }
  );

  // Extract slotId from status response
  let slotId;
  try {
    const statusData = JSON.parse(statusInitRes.body);
    slotId = statusData.slotId;
  } catch (e) {
    console.error('Failed to parse slotId from status response:', e);
    return; // Exit if we can't get slotId
  }

  check(statusInitRes, {
    'get status init 200': (r) => r.status === 200,
  });

  // Updated headers with actual viewKey and slotId from API
  const baseHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-requested-with': 'XMLHttpRequest',
    'ggj-live-slot-id': slotId,
    'ggj-live-view-key': viewKey,
  };
  
  // User session loop (15 minutes = 90 iterations of 10s each)
  let iteration = 0;
  const maxIterations = 90;

  while (iteration < maxIterations) {
    iteration++;

    // 2. Get Status (every 60s = every 6 iterations)
    if (iteration % 6 === 0) {
      const statusRes = http.get(
        `${BASE_URL}/api/ggj/v1/surface/watch-live/${LIVE_ID}/status`,
        { headers: baseHeaders, tags: { endpoint: 'get_status' } }
      );

      check(statusRes, {
        'get status 200': (r) => r.status === 200,
      });
      statusUpdateCounter.add(1);
    }
    
    // 3. Get View Count (every 60s = every 6 iterations)
    if (iteration % 6 === 0) {
      const viewRes = http.get(
        `${BASE_URL}/api/ggj/v1/surface/watch-live/${LIVE_ID}/concurrent-viewers`,
        { headers: baseHeaders, tags: { endpoint: 'get_view_count' } }
      );
      
      check(viewRes, {
        'get view count 200': (r) => r.status === 200,
      });
      viewCountCounter.add(1);
    }
    
    // 4. Keep Slot (every 240s = every 24 iterations)
    if (iteration % 24 === 0) {
      const slotRes = http.post(
        `${BASE_URL}/api/ggj/v1/surface/watch-live/${LIVE_ID}/view-slot/keep`,
        null,
        {
          headers: baseHeaders,
          tags: { endpoint: 'keep_slot' },
        }
      );
      
      check(slotRes, {
        'keep slot 200': (r) => r.status === 200,
      });
    }
    
    // // 5. Refresh Token (every 900s = every 90 iterations)
    // if (iteration % 90 === 0) {
    //   const tokenRes = http.post(
    //     `${BASE_URL}/api/auth/refresh`,
    //     null,
    //     {
    //       headers: baseHeaders,
    //       tags: { endpoint: 'refresh_token' },
    //     }
    //   );
      
    //   check(tokenRes, {
    //     'refresh token 200': (r) => r.status === 200,
    //   });
    // }
    
    // 6. Get Notification (every 30s = every 3 iterations)
    // if (iteration % 3 === 0) {
    //   const notiRes = http.get(
    //     `${BASE_URL}/api/notification/info`,
    //     {
    //       headers: baseHeaders,
    //       tags: { endpoint: 'notification' },
    //     }
    //   );
      
    //   check(notiRes, {
    //     'get notification 200': (r) => r.status === 200,
    //   });
    //   notificationCounter.add(1);
    // }
    
    // Wait 10 seconds before next iteration
    sleep(10);
  }
}

// Setup function (runs once per VU before main function)
export function setup() {
  console.log('Load test starting...');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Optional: Warmup request
  const warmupRes = http.get(`${BASE_URL}/health`, {
    headers: {
      'x-requested-with': 'XMLHttpRequest',
    },
  });
  
  return {
    timestamp: Date.now(),
  };
}

// Teardown function (runs once after all VUs finish)
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Started at: ${new Date(data.timestamp)}`);
  console.log(`Finished at: ${new Date()}`);
}

// Handle summary (custom summary output)
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += `${indent}Test Summary:\n`;
  summary += `${indent}=============\n`;
  summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `${indent}Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  
  return summary;
}