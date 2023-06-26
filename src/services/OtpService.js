const moment = require('moment');
const {VerificationToken} = require('../models');
const {createHash} = require('../utils');
class OtpService {
  static async generateOtp(UserId, length, type, expiresAfter = 10) {
    return new Promise(async (resolve, reject) => {
      const expires_at = moment().add(10, 'm').toDate();
      const token = createHash('123456');
      VerificationToken.findOne({where: {UserId, type}})
        .then(async exisiting => {
          if (exisiting) {
            const updated = await existing.update({
              expires_at,
              token,
            });

            resolve(updated.toObject());
            return;
          }
          const created = await VerificationToken.create({
            UserId,
            type,
            token,
            expires_at,
          });

          resolve(created.toObject());
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  static verifyOtp(UserId, type, token) {
    return new Promise(async (resolve, reject) => {
      const saved = await VerificationToken.findOne({where: {UserId, type}});
      if (saved && compareSync(token, saved.token)) {
        resolve(true);
        return;
      }

      reject(new Error('Invalida or wrong token.'));
    });
  }
}

module.exports = OtpService;
