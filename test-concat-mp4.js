const axios = require('axios');

// Test function to concatenate multiple MP4 files
async function testConcatMp4() {
  console.log('🚀 Starting MP4 concatenation test...\n');

  // NOTE: Replace these paths with actual MP4 file paths on your system
  const testData = {
    inputFiles: [
      './converted-videos/converted-1760501355503.mp4',
      './converted-videos/converted-1760501362582.mp4',
    ],
    outputPath: './converted-videos',
    outputName: `test-concatenated-${Date.now()}.mp4`
  };

  try {
    console.log('📤 Sending request to concat-mp4 endpoint...');
    console.log('📥 Input files:');
    testData.inputFiles.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file}`);
    });
    console.log(`📤 Output: ${testData.outputPath}/${testData.outputName}`);
    console.log();

    const startTime = Date.now();

    const response = await axios.post(
      'http://localhost:3000/video/concat-mp4',
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 600000 // 10 minutes timeout
      }
    );

    const endTime = Date.now();
    const totalTimeMs = endTime - startTime;

    console.log('\n✅ Concatenation completed successfully!');
    console.log('📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log(`\n⏱️  Total request time: ${totalTimeMs}ms`);

  } catch (error) {
    console.error('\n❌ Concatenation failed!');
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
testConcatMp4();
