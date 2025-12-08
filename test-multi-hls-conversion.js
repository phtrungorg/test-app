const axios = require('axios');

// Test function to convert multiple HLS sources to a single MP4
async function testMultiHlsConversion() {
  console.log('🚀 Starting multi-source HLS to MP4 conversion test...\n');

  const testData = {
    sources: [
      { hlsUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' },
      { hlsUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
    ],
    outputPath: './converted-videos'
  };

  try {
    console.log('📤 Sending request to convert-multiple-hls-to-mp4 endpoint...');
    console.log('📥 Input sources:');
    testData.sources.forEach((source, i) => {
      console.log(`   ${i + 1}. ${source.hlsUrl}`);
    });
    console.log();

    const startTime = Date.now();

    const response = await axios.post(
      'http://localhost:3000/video/convert-multiple-hls-to-mp4',
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 600000 // 10 minutes timeout
      }
    );

    const endTime = Date.now();
    const totalTimeMs = endTime - startTime;

    console.log('\n✅ Conversion completed successfully!');
    console.log('📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log(`\n⏱️  Total request time: ${totalTimeMs}ms`);

  } catch (error) {
    console.error('\n❌ Conversion failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from server');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testMultiHlsConversion();
