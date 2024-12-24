const axios = require('axios');

// Cloudflare credentials
const API_TOKEN = '_29KOI2S1B4vMN_AEFpYuH9NgX-cMrDy_ySp-iQB'; // Replace with your API token
const ACCOUNT_ID = 'b646bf1a9bad8bf45a259a21ed023dc7'; // Replace with your account ID

// Cloudflare Stream API URL
const STREAM_API_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`;

// Function to fetch all videos
const fetchAllVideos = async () => {
  try {
    let videos = [];
    let page = 1;
    // let hasMore = true;

    while (page < 2) {
      const response = await axios.get(`${STREAM_API_URL}`, {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
        params: {
          page,
          per_page: 50,
        },
      });

      videos = videos.concat(response.data.result);
      page++;
    }

    return videos;
  } catch (error) {
    console.error('Error fetching videos:', error.response?.data || error.message);
    throw error;
  }
};

// Function to delete a video
const deleteVideo = async (videoId) => {
  try {
    await axios.delete(`${STREAM_API_URL}/${videoId}`, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
    });
    console.log(`Deleted video ID: ${videoId}`);
  } catch (error) {
    console.error(`Error deleting video ID ${videoId}:`, error.response?.data || error.message);
  }
};

// Main function to delete all videos
const deleteAllVideos = async () => {
  try {
    const videos = await fetchAllVideos();
    console.log(`Found ${videos.length} videos.`);

    for (const video of videos) {
      await deleteVideo(video.uid);
    }

    console.log('All videos deleted successfully.');
  } catch (error) {
    console.error('Error in deleteAllVideos:', error.message);
  }
};

// Execute the script
deleteAllVideos();
