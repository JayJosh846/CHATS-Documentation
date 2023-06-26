const {S3} = require('aws-sdk');
const fs = require('fs');
const {Logger} = require('../libs');
const {awsConfig} = require('../config');
const SecretsManager = require('aws-sdk/clients/secretsmanager');

const {accessKeyId, secretAccessKey} = require('../config/aws');
const {GenerateSecrete} = require('../utils');

const client = new SecretsManager({
  region: awsConfig.region,
  secretAccessKey: awsConfig.secretAccessKey,
  accessKeyId: awsConfig.accessKeyId
});

const AwsS3 = new S3({
  accessKeyId,
  secretAccessKey
});

class AwsUploadService {
  static async uploadFile(file, fileKey, awsBucket, acl = 'public-read') {
    return new Promise(async (resolve, reject) => {
      AwsS3.upload(
        {
          Bucket: awsBucket,
          Key: fileKey,
          ACL: acl,
          Body: fs.createReadStream(file.path),
          ContentType: file.type
        },
        (err, data) => {
          err && reject(err);
          if (data) {
            fs.unlinkSync(file.path);
            resolve(data.Location);
          }
        }
      );
    });
  }
  static async createSecret(id) {
    let params = {
      Name: awsConfig.campaignSecretName + id,
      Description: 'Unique secrete for each campaign',
      SecretString: GenerateSecrete()
    };
    //xOC&*wPo3jgCcDVkd)rdQAN
    try {
      const secret = client.createSecret(params, (err, data) => {
        if (!err) return data;
        throw new Error(err.stack);
      });
      return secret;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }
  static async describeSecret(id) {
    let params = {
      SecretId: `Unique Campaign Secret ID`
    };
    try {
      const secret = client.createSecret(params, (error, data) => {
        if (!error) {
          return data;
        } else {
          throw new Error(error.stack);
        }
      });
    } catch (error) {}
  }
  static async getMnemonic(id) {
    // const { SecretsManager } = AWS;
    var secretName = id
        ? awsConfig.campaignSecretName + id
        : awsConfig.secreteName,
      secret,
      decodedBinarySecret;
    // Create a Secrets Manager client

    // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
    // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    // We rethrow the exception by default.
    try {
      const data = await client
        .getSecretValue({SecretId: secretName})
        .promise()
        .then(data => {
          if ('SecretString' in data) {
            secret = data.SecretString;
            return secret;
          } else {
            let buff = new Buffer(data.SecretBinary, 'base64');
            decodedBinarySecret = buff.toString('ascii');
            return decodedBinarySecret;
          }
        });
      return data;
    } catch (err) {
      if (err.code === 'DecryptionFailureException') {
        Logger.error(
          `Secrets Manager can't decrypt the protected secret text using the provided KMS key.`
        );
        throw err;
      } else if (err.code === 'InternalServiceErrorException') {
        Logger.error('An error occurred on the server side.');
        throw err;
      } else if (err.code === 'InvalidParameterException') {
        Logger.error('You provided an invalid value for a parameter.');
        throw err;
      } else if (err.code === 'InvalidRequestException') {
        Logger.error(
          `You provided a parameter value that is not valid for the current state of the resource`
        );
        throw err;
      } else if (err.code === 'ResourceNotFoundException') {
        Logger.error(`We can't find the resource that you asked for.`);
        if (id) {
          this.createSecret(id);
        } else throw err;
      }
      Logger.error(`Error decrypting : ${err}`);
    }
  }
}

module.exports = AwsUploadService;
