const {promisify} = require('util');
const qrcode = require('qrcode');

exports.generateQrcodeURL = async (data) => {
  try {
    const url =  await qrcode.toDataURL(data.toString());
    return url;
  } catch (error) {
    
    return null;
  }
}