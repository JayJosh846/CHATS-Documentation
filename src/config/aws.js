module.exports = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  secreteName: process.env.AWS_SECRET_NAME,
  campaignSecretName: process.env.UNIQUE_CAMPAIGN_SECRET_NAME,
  region: process.env.AWS_REGION
};
