require('dotenv').config();
const AWS = require('aws-sdk');
const fileSystem = require('fs');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

async function uploadFile(fileName, fileKey, bucket) {
  return new Promise(async function (resolve, reject) {
    const params = {
      Bucket: bucket,
      Key: fileKey,
      ACL: 'public-read',
      Body: fileSystem.createReadStream(fileName.path),
      ContentType: fileName.type
    };
    await s3.upload(params, function (s3Err, data) {
      if (s3Err) {
        console.log(s3Err, 'err');
        reject(s3Err);
      } else {
        console.log(`File uploaded successfully at ${data.Location}`);
        resolve(data.Location);
      }
    });
  });
}

module.exports = uploadFile;
