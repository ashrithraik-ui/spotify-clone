const { ImageKit } = require('@imagekit/nodejs');

const DEFAULT_IMAGEKIT_TIMEOUT_MS = 120_000; // 2 minutes

const ImageKitClient = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  timeout: Number(process.env.IMAGEKIT_TIMEOUT_MS) || DEFAULT_IMAGEKIT_TIMEOUT_MS,
  maxRetries: 3,
});

async function uploadFile(file) {
  // file can be a Buffer, a Readable stream, or a data URL string.
  try {
    const result = await ImageKitClient.files.upload({
      file,
      fileName: `music-${Date.now()}`,
      folder: 'yt-complete-backend/music',
    });
    return result;
  } catch (error) {
    console.error('ImageKit upload error:', error?.message || error);
    throw error;
  }
}

module.exports = { uploadFile };