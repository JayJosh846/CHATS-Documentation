require('dotenv').config();
const JSEncrypt = require('node-jsencrypt');
const {tokenConfig} = require('../config');
const {createHmac} = require('crypto');

class Encryption {
  constructor(publicKey, privateKey) {
    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  encrypt(text) {
    const crypt = new JSEncrypt();
    crypt.setKey(this.publicKey);
    return crypt.encrypt(text);
  }

  decrypt(encrypted) {
    const crypt = new JSEncrypt();
    crypt.setPrivateKey(this.privateKey);
    const result = JSON.parse(crypt.decrypt(encrypted));
    return result;
  }

  encryptTokenPayload(payload) {
    const key = tokenConfig.secret;
    if (!Array.isArray(payload)) {
      payload = [payload];
    }

    const message = payload.map(data => data.toString()).join('');
    return createHmac('sha256', key).update(message).digest('hex');
  }
}

module.exports = new Encryption(
  process.env.ENCRYPTION_PUBLIC_KEY,
  process.env.ENCRYPTION_PRIVATE_KEY,
);
