var QRCode = require('qrcode');

async function codeGenerator(val) {
  return new Promise((resolve, reject) => {
    let value = String(val);
    QRCode.toDataURL(value, function (err, url) {
      if (err) reject(err);
      resolve(url);
    });
  });
}

module.exports = codeGenerator;
