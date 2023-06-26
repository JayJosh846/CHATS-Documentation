const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const qrcodeEncoding = 'base32';
const toDataURL = require('util').promisify(qrcode.toDataURL);
exports.generate2faSecret = async () => {
  const secretObject = speakeasy.generateSecret({
    length: 20,
    symbols: false,
    name: 'Chats.Cash'
  });

  const code = speakeasy.totp({
    secret: secretObject.base32,
    encoding: 'base32'
  });
  console.log(code, 'code');
  const secret = secretObject[qrcodeEncoding];
  const qrcode_url = await toDataURL(secretObject.otpauth_url);
  return {
    code,
    secret,
    qrcode_url
  };
};

exports.verify2faToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: qrcodeEncoding,
    token,
    window: 2
  });
};
