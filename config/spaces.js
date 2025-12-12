const AWS = require('aws-sdk');

// Configure DigitalOcean Spaces (S3-compatible)
const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com');

const s3Client = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.SPACES_KEY,
  secretAccessKey: process.env.SPACES_SECRET,
  region: 'us-east-1', // Required but not used by DO Spaces
  s3ForcePathStyle: false,
  signatureVersion: 'v4'
});

/**
 * Upload file to DigitalOcean Spaces
 * @param {string} key - File path/name in bucket
 * @param {Buffer} body - File content
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - Public URL of uploaded file
 */
async function uploadToSpaces(key, body, contentType = 'application/octet-stream') {
  const params = {
    Bucket: process.env.SPACES_BUCKET,
    Key: key,
    Body: body,
    ACL: 'public-read',
    ContentType: contentType
  };

  try {
    const result = await s3Client.upload(params).promise();
    console.log('✅ File uploaded:', result.Location);
    return result.Location;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

/**
 * Delete file from DigitalOcean Spaces
 * @param {string} key - File path/name in bucket
 */
async function deleteFromSpaces(key) {
  const params = {
    Bucket: process.env.SPACES_BUCKET,
    Key: key
  };

  try {
    await s3Client.deleteObject(params).promise();
    console.log('✅ File deleted:', key);
  } catch (error) {
    console.error('❌ Delete error:', error);
    throw error;
  }
}

/**
 * Get signed URL for private file
 * @param {string} key - File path/name in bucket
 * @param {number} expires - URL expiration in seconds
 * @returns {string} - Signed URL
 */
function getSignedUrl(key, expires = 3600) {
  const params = {
    Bucket: process.env.SPACES_BUCKET,
    Key: key,
    Expires: expires
  };

  return s3Client.getSignedUrl('getObject', params);
}

module.exports = {
  s3Client,
  uploadToSpaces,
  deleteFromSpaces,
  getSignedUrl
};
