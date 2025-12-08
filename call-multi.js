const axios = require('axios');

const URL = 'http://localhost:3000';
const REQUEST_COUNT = 1000;

async function sendRequest() {
  try {
    const response = await axios.get(URL);
    console.log(`Response: ${response.status}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

async function main() {
  console.log(`Sending ${REQUEST_COUNT} concurrent requests to ${URL}...`);
  const requests = Array.from({ length: REQUEST_COUNT }, () => sendRequest());
  await Promise.all(requests);
  console.log('All requests completed.');
}

main();