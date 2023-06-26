const { Op } = require('sequelize');
const { generate2faSecret, verify2faToken } = require('../utils');
const { User, PasswordResetToken, Invites } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { createHash, GenerateOtp } = require('../utils');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const OtpService = require('./OtpService');
const MailerService = require('./MailerService');
const UserService = require('./UserService');
const SmsService = require('./SmsService');
const { email } = require('../config/switchwallet');

/**
 * Verification Service is for generating and verifying users contact details(email, phone, etc)
*/

class VerificationServices {
  /**
   * 
   * @param {usersEmail} usersEmail users email to be verify
   */
  static async verifyEmail(usersEmail) {
    this.generateToken(email);
  }
  static async verifyUser(usersToken) {
    this.verifyToken(usersToken);
  }
  generateToken(email) {
    return jwt.sign(
      { email: data.email },
      process.env.SECRET_KEY,
      { expiresIn: '24hr' }
    );
  }
  verifyToken(token) {
    //verify token
    jwt.verify(
      confirmationCode,
      process.env.SECRET_KEY,
      async (err, payload) => {
        if (err) {
          //if token was tampered with or invalid
          console.log(err);
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Email verification failed Possibly the link is invalid or Expired'
          );
          return Response.send(res);
        }
        //fetch users records from the database
        const userExist = await db.User.findOne({
          where: { email: payload.email }
        });

        if (!userExist) {
          // if users email doesnt exist then
          console.log(err);
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Email verification failed, Account Not Found'
          );

          return Response.send(res);
        }
        //update users status to verified
        db.User.update(
          { status: 'activated', is_email_verified: true },
          { where: { email: payload.email } }
        )
          .then(() => {
            Response.setSuccess(
              200,
              'User With Email: ' + payload.email + ' Account Activated!'
            );
            return Response.send(res);
          })
          .catch(err => {
            console.log(err);
            reject(
              new Error('Users Account Activation Failed!. Please retry.')
            );
          });
      }
    );
  }
}


module.exports = VerificationServices;
