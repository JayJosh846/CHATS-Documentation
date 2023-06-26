require('dotenv').config();
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const {Logger} = require('../libs');

exports.createHash = value => bcryptjs.hashSync(value, 10);

exports.compareHash = (value, hash) => bcryptjs.compareSync(value, hash);

const {ECNRYPTION_METHOD, SECRET_KEY, SECRET_IV} = process.env;

const key = crypto
  .createHash('sha512')
  .update(SECRET_KEY)
  .digest('hex')
  .substring(0, 32);

exports.encryptData = async data => {
  try {
    const encryptionIV = crypto
      .createHash('sha512')
      .update(SECRET_IV)
      .digest('hex')
      .substring(0, 16);

    const cipher = crypto.createCipheriv(ECNRYPTION_METHOD, key, encryptionIV);
    return Buffer.from(
      cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
    ).toString('base64'); // Encrypts data and converts to hex and base64
  } catch (error) {
    throw new Error('secretKey, secretIV, and ecnryptionMethod are required');
  }
};

exports.decryptData = encryptedData => {
  try {
    const buff = Buffer.from(encryptedData, 'base64');
    const decipher = crypto.createDecipheriv(ECNRYPTION_METHOD, key, SECRET_IV);
    return (
      decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
      decipher.final('utf8')
    );
  } catch (error) {
    Logger.error('Error decrypting data' + JSON.stringify(error));
  }
};
