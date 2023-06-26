const util = require('../libs/Utils');
const {Op} = require('sequelize');
const {
  compareHash,
  createHash,
  SanitizeObject,
  HttpStatusCode,
  AclRoles,
  generateRandom,
  GenearteVendorId
} = require('../utils');
const db = require('../models');
const formidable = require('formidable');
var bcrypt = require('bcryptjs');
const Validator = require('validatorjs');
const sequelize = require('sequelize');
const uploadFile = require('./AmazonController');
const {
  BeneficiaryService,
  UserService,
  PaystackService,
  QueueService,
  WalletService,
  SmsService,
  MailerService,
  CampaignService
} = require('../services');
const {Response, Logger} = require('../libs');

const {Message} = require('@droidsolutions-oss/amqp-ts');
var amqp_1 = require('./../libs/RabbitMQ/Connection');
const codeGenerator = require('./QrCodeController');
const ZohoService = require('../services/ZohoService');
const sanitizeObject = require('../utils/sanitizeObject');
const AwsUploadService = require('../services/AwsUploadService');
const {data} = require('../libs/Response');

var transferToQueue = amqp_1['default'].declareQueue('transferTo', {
  durable: true
});

var transferFromQueue = amqp_1['default'].declareQueue('transferFrom', {
  durable: true
});

const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';

class UsersController {
  static async getAllUsers(req, res) {
    try {
      const allUsers = await UserService.getAllUsers();
      if (allUsers.length > 0) {
        Response.setSuccess(200, 'Users retrieved', allUsers);
      } else {
        Response.setSuccess(200, 'No User found');
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async addUser(req, res) {
    if (!req.body.first_name || !req.body.last_name || !req.body.email) {
      Response.setError(400, 'Please provide complete details');
      return Response.send(res);
    }
    try {
      const createdUser = await UserService.addUser(newUser);
      Response.setSuccess(201, 'User Added!', createdUser);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, error.message);
      return Response.send(res);
    }
  }

  static async createVendor(req, res) {
    const {first_name, last_name, email, phone, address, location, store_name} =
      req.body;

    try {
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        email: 'required|email',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        store_name: 'required|string',
        address: 'required|string',
        location: 'required|string'
      };

      const validation = new Validator(req.body, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const user = await UserService.findByEmail(email);
      if (user) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Email already taken'
        );
        return Response.send(res);
      }
      const rawPassword = generateRandom(8);
      const password = createHash(rawPassword);
      const vendor_id = GenearteVendorId();
      const createdVendor = await UserService.createUser({
        RoleId: AclRoles.Vendor,
        first_name,
        last_name,
        email,
        phone,
        password
      });
      await QueueService.createWallet(createdVendor.id, 'user');
      const store = await db.Market.create({
        store_name,
        address,
        location,
        UserId: createdVendor.id
      });

      await MailerService.verify(
        email,
        first_name + ' ' + last_name,
        rawPassword,
        vendor_id
      );
      await QueueService.createWallet(createdVendor.id, 'user');

      await SmsService.sendOtp(
        phone,
        `Hi, ${first_name}  ${last_name} your CHATS account ID is: ${vendor_id} , password is: ${rawPassword}`
      );
      createdVendor.dataValues.password = null;
      createdVendor.dataValues.store = store;
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Vendor Account Created.',
        createdVendor
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Contact Support' + error
      );
      return Response.send(res);
    }
  }
  static async groupAccount(req, res) {
    const {group, representative, member, campaignId} = req.body;

    try {
      const rules = {
        campaignId: 'required|integer',
        'representative.first_name': 'required|alpha',
        'representative.last_name': 'required|alpha',
        'representative.gender': 'required|in:male,female',
        'representative.email': 'required|email',
        'representative.phone': [
          'required',
          'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'
        ],
        'representative.address': 'string',
        'representative.location': 'string',
        'representative.password': 'required',
        'representative.dob': 'required|date',
        'representative.nfc': 'string',
        'member.*.full_name': 'required|string',
        'member.*.dob': 'required|date',
        'member.*.full_name': 'required|string',
        'group.group_name': 'required|string',
        'group.group_category': 'required|string'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const data = member;
      const find = await UserService.findByEmail(representative.email);
      if (find) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Email already taken'
        );
        return Response.send(res);
      }
      const result = await db.sequelize.transaction(async t => {
        const campaignExist = await CampaignService.getCampaignById(campaignId);
        if (!campaignExist) {
          Response.setError(404, 'Campaign not found');
          return Response.send(res);
        }
        representative.RoleId = AclRoles.Beneficiary;
        representative.password = createHash('0000');
        const parent = await db.User.create(representative, {transaction: t});
        await db.Beneficiary.create(
          {
            UserId: parent.id,
            CampaignId: campaignExist.id,
            approved: true,
            source: 'field app'
          },
          {transaction: t}
        );

        await QueueService.createWallet(parent.id, 'user', campaignId);
        group.representative_id = parent.id;
        const grouping = await db.Group.create(group, {transaction: t});

        for (let mem of data) {
          mem.group_id = grouping.id;
          //await QueueService.createWallet(mem.id, 'user');
        }
        const members = await db.Member.bulkCreate(data, {transaction: t});

        parent.dataValues.group = grouping;
        parent.dataValues.members = members;
        return parent;
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Group Created',
        result
      );
      return Response.send(res);
      // });
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Contact Support' + error
      );
      return Response.send(res);
    }
  }
  static async addBankAccount(req, res) {
    try {
      const data = SanitizeObject(req.body, ['account_number', 'bank_code']);
      try {
        const resolved = await PaystackService.resolveAccount(
          data.account_number,
          data.bank_code
        );
        data.account_name = resolved.account_name;
      } catch (err) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, err.message);
        return Response.send(res);
      }

      try {
        const recipient = await PaystackService.createRecipientReference(
          data.account_name,
          data.account_number,
          data.bank_code
        );
        data.bank_name = recipient.details.bank_name;
        data.recipient_code = recipient.recipient_code;
        data.type = recipient.type;
      } catch (err) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, err.message);
        return Response.send(res);
      }

      const account = await UserService.addUserAccount(req.user.id, data);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Bank Account Added',
        account
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async getUserAccouns(req, res) {
    try {
      const accounts = await UserService.findUserAccounts(req.user.id);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Bank Accounts', accounts);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async updateProfile(req, res) {
    try {
      const data = req.body;
      const location = JSON.parse(req.user.location);
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        phone: ['regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        username: 'string',
        nin: 'size:16'
      };
      Logger.info(`Request Body: ${JSON.stringify(data)}`);
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Logger.error(`Validation Error: ${JSON.stringify(validation.errors)}`);
        Response.setError(422, validation.errors);
        return Response.send(res);
      }

      if (data.username) {
        const user = await UserService.findSingleUser({
          username: data.username
        });
        const me = await UserService.findSingleUser({
          username: data.username,
          id: req.user.id
        });
        if (!me && user) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            `Username already taken`
          );
          return Response.send(res);
        }
      }

      if (data.nin && process.env.ENVIRONMENT !== 'staging') {
        const hash = createHash(data.nin);
        const isExist = await UserService.findSingleUser({nin: data.nin});
        if (isExist) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            `user with this nin: ${data.nin} exist`
          );
          return Response.send(res);
        }
        const nin = await UserService.nin_verification(
          {number: data.nin},
          location.country
        );
        if (!nin.status) {
          Response.setError(
            HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
            'Not a Valid NIN'
          );
          return Response.send(res);
        }
        data.is_verified = true;
        data.is_nin_verified = true;
        data.nin = hash;
        await req.user.update(data);
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Profile Updated',
          req.user.toObject()
        );
        return Response.send(res);
      }
      data.is_nin_verified = true;
      data.is_verified = true;
      await req.user.update(data);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Profile Updated',
        req.user.toObject()
      );
      return Response.send(res);
    } catch (error) {
      Logger.error(`Server Error. Please retry: ${JSON.stringify(error)}`);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.' + error
      );
      return Response.send(res);
    }
  }

  static async findProfile(req, res) {
    try {
      const profile = (await UserService.findUser(req.user.id)).toObject();
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'User profile', profile);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async updatedUser(req, res) {
    try {
      const data = req.body;
      data['today'] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        phone: 'required|string',
        address: 'required|string',
        location: 'required|string',
        marital_status: 'required|alpha|in:single,married',
        dob: 'date|before:today',
        bvn: 'numeric',
        nin: 'numeric',
        id: 'required|numeric'
      };
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        var filterData = {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          address: data.address,
          location: data.location,
          marital_status: data.marital_status,
          dob: data.dob,
          bvn: data.bvn,
          nin: data.nin
        };

        var updateData = {};
        for (const index in filterData) {
          if (data[index]) {
            updateData[index] = data[index];
          }
        }
        const user_exist = await db.User.findByPk(data.id)
          .then(async user => {
            await user.update(updateData).then(response => {
              Response.setSuccess(200, 'User Updated Successfully');
              return Response.send(res);
            });
          })
          .catch(err => {
            Response.setError(404, 'Invalid User Id');
            return Response.send(res);
          });
      }
    } catch (error) {
      Response.setError(422, error.message);
      return Response.send(res);
    }
  }

  static async updateProfileImage(req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      const rules = {
        userId: 'required|numeric'
      };
      const validation = new Validator(fields, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        if (!files.profile_pic) {
          Response.setError(422, 'Profile Image Required');
          return Response.send(res);
        } else {
          const user = await db.User.findByPk(fields.userId);
          if (user) {
            const extension = files.profile_pic.name.substring(
              files.profile_pic.name.lastIndexOf('.') + 1
            );
            await uploadFile(
              files.profile_pic,
              'u-' + environ + '-' + user.id + '-i.' + extension,
              'convexity-profile-images'
            ).then(url => {
              user.update({
                profile_pic: url
              });
            });
            Response.setSuccess(200, 'Profile Picture Updated');
            return Response.send(res);
          } else {
            Response.setError(422, 'Invalid User');
            return Response.send(res);
          }
        }
      }
    });
  }

  static async updateNFC(req, res) {
    try {
      const data = req.body;
      const rules = {
        nfc: 'required|string',
        id: 'required|numeric'
      };
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        await db.User.update(data, {
          where: {
            id: data.id
          }
        }).then(() => {
          Response.setSuccess(200, 'User NFC Data Updated Successfully');
          return Response.send(res);
        });
      }
    } catch (error) {
      Response.setError(422, error.message);
      return Response.send(res);
    }
  }

  static async getAUser(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      Response.setError(400, 'Please input a valid numeric value');
      return Response.send(res);
    }

    try {
      const theUser = await UserService.getAUser(id);
      if (!theUser) {
        Response.setError(404, `Cannot find User with the id ${id}`);
      } else {
        Response.setSuccess(200, 'Found User', theUser);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(404, error.toString());
      return Response.send(res);
    }
  }

  static async resetPassword(req, res, next) {
    const email = req.body.email;
    try {
      //check if users exist in the db with email address
      db.User.findOne({
        where: {
          email: email
        }
      })
        .then(user => {
          //reset users email password
          if (user !== null) {
            //if there is a user
            //generate new password
            const newPassword = Response.generatePassword();
            //update new password in the db
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(newPassword, salt).then(hash => {
                const encryptedPassword = hash;
                return db.User.update(
                  {
                    password: encryptedPassword
                  },
                  {
                    where: {
                      email: email
                    }
                  }
                ).then(updatedRecord => {
                  //mail user a new password
                  //respond with a success message
                  res.status(201).json({
                    status: 'success',
                    message:
                      'An email has been sent to the provided email address, kindly login to your email address to continue'
                  });
                });
              });
            });
          }
        })
        .catch(err => {
          res.status(404).json({
            status: 'error',
            error: err
          });
        });
    } catch (error) {
      Response.setError(500, 'Internal Server Error ' + error.toString);
      return Response.send(res);
    }
  }

  static async deactivate(req, res) {
    try {
      const id = req.body.userId;

      const user = await db.User.findByPk(id);

      user.status = 'suspended';
      user.save();

      Response.setSuccess(200, 'User Deactivated successfully');
      return Response.send(res);
    } catch (error) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }
  }

  static async updatePassword(req, res) {
    const {oldPassword, newPassword, confirmedPassword} = req.body;
    if (newPassword !== confirmedPassword) {
      Response.setError(400, 'New password does not match confirmed password ');
      return Response.send(res);
    }
    const userId = req.user.id;
    db.User.findOne({
      where: {
        id: userId
      }
    })
      .then(user => {
        bcrypt
          .compare(oldPassword, user.password)
          .then(valid => {
            if (!valid) {
              Response.setError(419, 'Old Password does not match');
              return Response.send(res);
            }
            //update new password in the db
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(newPassword, salt).then(async hash => {
                const encryptedPassword = hash;
                await user
                  .update({
                    password: encryptedPassword
                  })
                  .then(updatedRecord => {
                    //mail user a new password
                    // //respond with a success message
                    // res.status(201).json({
                    //   status: "success",
                    //   message:
                    //     "An email has been sent to the provided email address, kindly login to your email address to continue",
                    // });
                    Response.setError(200, 'Password changed successfully');
                    return Response.send(res);
                  });
              });
            });
          })
          .catch(err => {
            Response.setError(419, 'Internal Server Error. Please try again.');
            return Response.send(res);
          });
      })
      .catch(err => {
        Response.setError(419, 'Internal Server Error. Please try again.');
        return Response.send(res);
      });
  }

  static async deleteUser(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      Response.setError(400, 'Please provide a numeric value');
      return Response.send(res);
    }

    try {
      const UserToDelete = await UserService.deleteUser(id);

      if (UserToDelete) {
        Response.setSuccess(200, 'User deleted');
      } else {
        Response.setError(404, `User with the id ${id} cannot be found`);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getBeneficiaryTransactions(req, res) {
    const beneficiary = req.params.beneficiary;
    const beneficiary_exist = await BeneficiaryService.getUser(beneficiary);
    if (beneficiary_exist) {
      const wallet = await beneficiary_exist.getWallet();
      const wallets = wallet.map(element => {
        return element.uuid;
      });
      await db.Transaction.findAll({
        where: {
          [Op.or]: {
            walletRecieverId: {
              [Op.in]: wallets
            },
            walletSenderId: {
              [Op.in]: wallets
            }
          }
        }
      }).then(response => {
        Response.setSuccess(200, 'Transactions Retrieved', response);
        return Response.send(res);
      });
    } else {
      Response.setError(422, 'Beneficiary Id is Invalid');
      return Response.send(res);
    }
  }

  static async getRecentTransactions(req, res) {
    const beneficiary = req.params.beneficiary;
    const beneficiary_exist = await BeneficiaryService.getUser(beneficiary);
    if (beneficiary_exist) {
      const wallet = await beneficiary_exist.getWallet();
      const wallets = wallet.map(element => {
        return element.uuid;
      });

      await db.Transaction.findAll({
        where: {
          [Op.or]: {
            walletRecieverId: {
              [Op.in]: wallets
            },
            walletSenderId: {
              [Op.in]: wallets
            }
          }
        },
        order: [['createdAt', 'DESC']],
        limit: 10
      }).then(response => {
        Response.setSuccess(200, 'Transactions Retrieved', response);
        return Response.send(res);
      });
    } else {
      Response.setError(422, 'Beneficiary Id is Invalid');
      return Response.send(res);
    }
  }

  static async getTransaction(req, res) {
    const uuid = req.params.uuid;
    const transaction_exist = await db.Transaction.findOne({
      where: {
        uuid: uuid
      },
      include: ['SenderWallet', 'RecievingWallet']
    });
    if (transaction_exist) {
      Response.setSuccess(200, 'Transaction Retrieved', transaction_exist);
      return Response.send(res);
    } else {
      Response.setError(422, 'Transaction Id is Invalid');
      return Response.send(res);
    }
  }

  static async getStats(req, res) {
    var date = new Date();
    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const wallet = await db.User.findOne({
      where: {
        id: req.user.id
      },
      include: ['Wallet']
    });
    const wallets = wallet.Wallet.map(element => {
      return element.uuid;
    });

    const income = await db.Transaction.findAll({
      where: {
        walletRecieverId: {
          [Op.in]: wallets
        },
        createdAt: {
          [Op.gte]: firstDay,
          [Op.lte]: lastDay
        }
      },
      attributes: [[sequelize.fn('sum', sequelize.col('amount')), 'income']],
      raw: true
    });
    const expense = await db.Transaction.findAll({
      where: {
        walletSenderId: {
          [Op.in]: wallets
        },
        createdAt: {
          [Op.gte]: firstDay,
          [Op.lte]: lastDay
        }
      },
      attributes: [[sequelize.fn('sum', sequelize.col('amount')), 'expense']],
      raw: true
    });
    Response.setSuccess(200, 'Statistics Retrieved', [
      {
        balance: wallet.Wallet.balance,
        income: income[0].income == null ? 0 : income[0].income,
        expense: expense[0].expense == null ? 0 : expense[0].expense
      }
    ]);
    return Response.send(res);
  }

  static async getChartData(req, res) {
    const users = await db.User.findAll({
      where: {
        RoleId: 5,
        dob: {
          [Op.ne]: null
        }
      }
    });
    const gender_chart = {
      male: 0,
      female: 0
    };
    const age_groups = {
      '18-29': 0,
      '30-41': 0,
      '42-53': 0,
      '54-65': 0,
      '65~': 0
    };
    for (const user of users) {
      if (user.gender == 'male') {
        gender_chart['male'] += 1;
      } else if (user.gender == 'female') {
        gender_chart['female'] += 1;
      }

      const diff = getDifference(user.dob);
      if (diff >= 18 && diff <= 29) {
        age_groups['18-29'] += 1;
      } else if (diff >= 30 && diff <= 41) {
        age_groups['30-41'] += 1;
      } else if (diff >= 42 && diff <= 53) {
        age_groups['42-53'] += 1;
      } else if (diff >= 54 && diff <= 65) {
        age_groups['54-65'] += 1;
      } else if (diff > 65) {
        age_groups['65~'] += 1;
      }
    }
    Response.setSuccess(200, 'Chart Data Retrieved', {
      gender_chart: gender_chart,
      age_chart: age_groups
    });
    return Response.send(res);
  }

  static async countUserTypes(req, res) {
    let vendors = await db.User.count({
      where: {
        RoleId: 4
      }
    });
    let beneficiaries = await db.User.count({
      where: {
        RoleId: 5
      }
    });
    Response.setSuccess(200, 'Users Type Counted', {
      vendors,
      beneficiaries
    });
    return Response.send(res);
  }

  static async getTotalAmountRecieved(req, res) {
    let id = req.params.id;
    await db.User.findOne({
      where: {
        id: req.params.id
      },
      include: {
        model: db.Wallet,
        as: 'Wallet'
      }
    }).then(async user => {
      await db.Transaction.findAll({
        where: {
          walletRecieverId: user.Wallet.uuid
        },
        attributes: [
          [sequelize.fn('sum', sequelize.col('amount')), 'amount_recieved']
        ]
      }).then(async transactions => {
        Response.setSuccess(200, 'Recieved Transactions', {
          transactions
        });
        return Response.send(res);
      });
    });
  }

  static async getWalletBalance(req, res) {
    const user_id = req.params.id;
    const userExist = await db.User.findOne({
      where: {
        id: user_id
      },
      include: ['Wallet']
    })
      .then(user => {
        Response.setSuccess(200, 'User Wallet Balance', user.Wallet);
        return Response.send(res);
      })
      .catch(err => {
        Response.setError(404, 'Invalid User Id');
        return Response.send(res);
      });
  }

  static async addToCart(req, res) {
    let data = req.body;
    let rules = {
      userId: 'required|numeric',
      productId: 'required|numeric',
      quantity: 'required|numeric'
    };
    let validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(400, validation.errors);
      return Response.send(res);
    } else {
      let user = await db.User.findByPk(data.userId);
      if (!user) {
        Response.setError(404, 'Invalid User');
        return Response.send(res);
      }
      let product = await db.Products.findOne({
        where: {
          id: data.productId
        },
        include: {
          model: db.Market,
          as: 'Vendor'
        }
      });
      if (!product) {
        Response.setError(404, 'Invalid Product');
        return Response.send(res);
      }
      let pendingOrder = await db.Order.findOne({
        where: {
          UserId: data.userId,
          status: 'pending'
        },
        include: {
          model: db.OrderProducts,
          as: 'Cart',
          order: [['createdAt', 'DESC']],
          include: {
            model: db.Products,
            as: 'Product'
          }
        }
      });

      if (!pendingOrder) {
        let uniqueId = String(
          Math.random().toString(36).substring(2, 12)
        ).toUpperCase();
        await user
          .createOrder({
            OrderUniqueId: uniqueId
          })
          .then(async order => {
            await order
              .createCart({
                ProductId: product.id,
                unit_price: product.price,
                quantity: data.quantity,
                total_amount: product.price * data.quantity
              })
              .then(cart => {
                Response.setSuccess(
                  201,
                  product.name + ' has been added to cart'
                );
                return Response.send(res);
              });
          });
      } else {
        if (pendingOrder.Cart.length) {
          if (pendingOrder.Cart[0].Product.MarketId != product.MarketId) {
            Response.setError(
              400,
              'Cannot add product that belongs to a different vendor'
            );
            return Response.send(res);
          } else {
            let productAddedToCart = await db.OrderProducts.findOne({
              where: {
                ProductId: product.id
              }
            });
            if (productAddedToCart) {
              await productAddedToCart
                .update({
                  quantity: data.quantity,
                  total_amount: data.quantity * product.price,
                  unit_price: product.price
                })
                .then(() => {
                  Response.setSuccess(
                    201,
                    product.name + ' has been added to cart'
                  );
                  return Response.send(res);
                });
            } else {
              await pendingOrder
                .createCart({
                  ProductId: product.id,
                  quantity: data.quantity,
                  total_amount: data.quantity * product.price,
                  unit_price: product.price
                })
                .then(() => {
                  Response.setSuccess(
                    201,
                    product.name + ' has been added to cart'
                  );
                  return Response.send(res);
                });
            }
          }
        } else {
          await pendingOrder
            .createCart({
              ProductId: product.id,
              quantity: data.quantity,
              total_amount: data.quantity * product.price,
              unit_price: product.price
            })
            .then(() => {
              Response.setSuccess(
                201,
                product.name + ' has been added to cart'
              );
              return Response.send(res);
            });
        }
      }
    }
  }

  static async getCart(req, res) {
    let id = req.params.userId;
    let user = await db.User.findByPk(id);
    if (!user) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }
    let pendingOrder = await db.Order.findOne({
      where: {
        UserId: id,
        status: 'pending'
      },
      include: {
        model: db.OrderProducts,
        as: 'Cart',
        attributes: {
          exclude: ['OrderId']
        }
      }
    });

    if (pendingOrder && pendingOrder.Cart.length) {
      Response.setSuccess(200, 'Cart', {
        cart: pendingOrder.Cart
      });
      return Response.send(res);
    } else {
      Response.setError(400, 'No Item in Cart');
      return Response.send(res);
    }
  }

  static async updatePin(req, res) {
    let data = req.body;
    let rules = {
      userId: 'required|numeric',
      pin: 'required|numeric'
    };
    let validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      let user = await db.User.findByPk(data.userId);
      if (!user) {
        Response.setError(404, 'Invalid User');
        return Response.send(res);
      } else {
        await user
          .update({
            pin: data.pin
          })
          .then(() => {
            Response.setSuccess(200, 'Pin updated Successfully');
            return Response.send(res);
          });
      }
    }
  }

  static async getSummary(req, res) {
    const id = req.params.id;

    const user = await db.User.findOne({
      where: {
        id: req.params.id
      },
      include: {
        model: db.Wallet,
        as: 'Wallet'
      }
    });

    if (!user) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }

    const wallets = user.Wallet.map(element => {
      return element.uuid;
    });

    const spent = await db.Transaction.sum('amount', {
      where: {
        walletSenderId: {
          [Op.in]: wallets
        }
      }
    });
    const recieved = await db.Transaction.sum('amount', {
      where: {
        walletRecieverId: {
          [Op.in]: wallets
        }
      }
    });
    Response.setSuccess(200, 'Summary', {
      balance: user.Wallet.balance,
      recieved,
      spent
    });
    return Response.send(res);
  }

  static async fetchPendingOrder(req, res) {
    const userId = req.params.userId;
    const userExist = await db.User.findByPk(userId);

    if (userExist) {
      let pendingOrder = await db.Order.findOne({
        where: {
          UserId: userId,
          status: 'pending'
        },
        include: {
          model: db.OrderProducts,
          as: 'Cart',
          attributes: {
            exclude: ['OrderId']
          },
          include: {
            model: db.Products,
            as: 'Product',
            include: {
              model: db.Market,
              as: 'Vendor'
            }
          }
        }
      });

      if (pendingOrder) {
        const image = await codeGenerator(pendingOrder.id);
        let result;
        result = {
          orderUniqueId: pendingOrder.OrderUniqueId,
          image,
          status: pendingOrder.status
        };
        if (pendingOrder.Cart) {
          let cart = pendingOrder.Cart.map(cart => {
            return {
              quantity: cart.quantity,
              price: cart.unit_price,
              product: cart.Product.name
            };
          });
          result['vendor'] = pendingOrder.Cart[0].Product.Vendor.store_name;
          result['cart'] = cart;
        }
        Response.setSuccess(200, 'Pending Order', result);
        return Response.send(res);
      } else {
        Response.setSuccess(200, 'Pending Order', pendingOrder);
        return Response.send(res);
      }
    } else {
      Response.setError(400, 'Invalid User');
      return Response.send(res);
    }
  }

  static async transact(req, res) {
    const data = req.body;
    const rules = {
      senderAddr: 'required|string',
      recieverAddr: 'required|string',
      amount: 'required|numeric'
    };

    let validation = new Validator(data, rules);

    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      const senderExist = await db.Wallet.findOne({
        where: {
          address: data.senderAddr,
          CampaignId: NULL,
          [Op.or]: {
            AccountUserType: ['user', 'organisation']
          }
        }
      });

      if (!senderExist) {
        Response.setError(404, 'Sender Wallet does not Exist');
        return Response.send(res);
      }

      const recieverExist = await db.Wallet.findOne({
        where: {
          address: data.recieverAddr,
          CampaignId: NULL,
          [Op.or]: {
            AccountUserType: ['user', 'organisation']
          }
        }
      });

      if (!senderExist) {
        Response.setError(404, 'Reciever Wallet does not Exist');
        return Response.send(res);
      }

      if (senderExist.balance < data.amount) {
        Response.setError(
          422,
          'Sender Balance Insufficient to fund Transaction'
        );
        return Response.send(res);
      } else {
        let parentEntity, parentType;
        if (senderExist.AccountUserType === 'organisation') {
          parentType = 'organisation';
          parentEntity = await db.Organisations.findByPk(
            senderExist.AccountUserId
          );
        } else if (senderExist.AccountUserType === 'user') {
          parentType = 'user';
          parentEntity = await db.User.findByPk(senderExist.AccountUserId);
        }
        await parentEntity
          .createTransaction({
            walletSenderId: senderExist.uuid,
            walletRecieverId: recieverExist.uuid,
            amount: data.amount,
            narration:
              parentType === 'organisation'
                ? `Transfer to ${parentEntity.name}`
                : `Transfer to ${parentEntity.first_name} ${parentEntity.last_name}`
          })
          .then(transaction => {
            transferToQueue.send(
              new Message(
                {
                  senderAddress: senderExist.address,
                  senderPass: senderExist.privateKey,
                  reciepientAddress: recieverExist.address,
                  amount: data.amount,
                  transaction: transaction.uuid
                },
                {
                  contentType: 'application/json'
                }
              )
            );
          });

        Response.setSuccess(200, 'Payment Initiated');
        return Response.send(res);
      }
    }
  }

  static async checkOut(req, res) {
    let data = req.body;

    let rules = {
      userId: 'required|numeric',
      pin: 'required|numeric',
      orderId: 'required|numeric',
      campaign: 'campaign|numeric'
    };

    let validation = new Validator(data, rules);

    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      let user = await db.User.findOne({
        where: {
          id: data.userId
        },
        include: {
          model: db.Wallet,
          as: 'Wallet',
          where: {
            CampaignId: NULL
          }
        }
      });

      if (!user) {
        Response.setError(404, 'Invalid User');
        return Response.send(res);
      }

      if (user.pin != data.pin) {
        Response.setError(400, 'Invalid Pin');
        return Response.send(res);
      }

      let pendingOrder = await db.Order.findOne({
        where: {
          UserId: data.userId,
          status: 'pending'
        },
        include: {
          model: db.OrderProducts,
          as: 'Cart',
          include: {
            model: db.Products,
            as: 'Product',
            include: {
              model: db.Market,
              as: 'Vendor'
            }
          }
        }
      });

      if (pendingOrder && pendingOrder.Cart.length) {
        let sum = pendingOrder.Cart.reduce((a, b) => {
          return Number(a) + Number(b.total_amount);
        }, 0);
        if (user.Wallet[0].balance < sum) {
          Response.setError(
            400,
            'Insufficient Funds in Wallet to clear Cart Items'
          );
          return Response.send(res);
        } else {
          try {
            let result = await db.sequelize.transaction(async t => {
              let vendor = await db.Wallet.findOne({
                where: {
                  AccountUserId: pendingOrder.Cart[0].Product.Vendor.UserId,
                  AccountUserType: 'user',
                  CampaignId: null
                }
              });
              let buyer, type;

              const belongsToCampaign = await db.Beneficiaries.findOne({
                where: {
                  CampaignId: data.campaign,
                  UserId: vendor.AccountUserId
                }
              });

              if (belongsToCampaign) {
                type = 'campaign';
                buyer = await db.Wallet.findOne({
                  where: {
                    AccountUserId: data.userId,
                    AccountUserType: 'user',
                    CampaignId: data.campaign
                  }
                });
              } else {
                type = 'main';
                buyer = await db.Wallet.findOne({
                  where: {
                    AccountUserId: data.userId,
                    AccountUserType: 'user',
                    CampaignId: null
                  }
                });
              }

              let ngo = await db.Wallet.findOne({
                where: {
                  AccountUserType: 'organisation',
                  CampaignId: data.campaign
                }
              });

              await pendingOrder
                .createTransaction({
                  walletSenderId: buyer.uuid,
                  walletRecieverId: vendor.uuid,
                  amount: sum,
                  status: 'processing',
                  is_approved: false,
                  narration: 'Payment for Order ' + pendingOrder.OrderUniqueId
                })
                .then(async transaction => {
                  if (type === 'campaign') {
                    const transferFromQueueMessage = {
                      ownerAddress: ngo.address,
                      recieverAddress: vendor.address,
                      spenderAddress: buyer.address,
                      senderKey: buyer.privateKey,
                      amount: sum,
                      transactionId: transaction.uuid,
                      pendingOrder: pendingOrder.id
                    };
                    transferFromQueue.send(
                      new Message(transferFromQueueMessage, {
                        contentType: 'application/json'
                      })
                    );
                  } else if (type == 'main') {
                    const transferToQueueMessage = {
                      reciepientAddress: vendor.address,
                      senderAddress: buyer.address,
                      senderPass: buyer.privateKey,
                      amount: sum,
                      transaction: transaction.uuid
                    };

                    transferToQueue.send(
                      new Message(transferToQueueMessage, {
                        contentType: 'application/json'
                      })
                    );
                  }
                  Response.setSuccess(200, 'Transfer Initiated');
                  return Response.send(res);
                });
            });
          } catch (error) {
            Response.setError(500, error.message);
            return Response.send(res);
          }
        }
      } else {
        Response.setError(400, 'No Item in Cart');
        return Response.send(res);
      }
    }
  }

  static async setAccountPin(req, res) {
    try {
      if (req.user.pin) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'PIN already set. Chnage PIN or contact support.'
        );
        return Response.send(res);
      }
      const pin = createHash(req.body.pin.trim());
      await UserService.update(req.user.id, {
        pin
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'PIN set successfully.');
      return Response.send(res);
    } catch (error) {
      console.log('setAccountPin', error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'PIN update failed..'
      );
      return Response.send(res);
    }
  }

  static async updateAccountPin(req, res) {
    try {
      if (!req.user.pin) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'PIN not found. Set PIN first.'
        );
        return Response.send(res);
      }

      if (!compareHash(req.body.old_pin, req.user.pin)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid or wrong old PIN.'
        );
        return Response.send(res);
      }
      const pin = createHash(req.body.new_pin);
      await UserService.update(req.user.id, {
        pin
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'PIN changed successfully.'
      );
      return Response.send(res);
    } catch (error) {
      console.log('updateAccountPin', error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'PIN update failed..'
      );
      return Response.send(res);
    }
  }

  static async beneficiaryWithdrawFromBankAccount(req, res) {
    const {amount, campaignId, accountno} = req.params;
    try {
      if (!Number(amount)) {
        Response.setError(400, 'Please input a valid amount');
        return Response.send(res);
      } else if (!Number(campaignId)) {
        Response.setError(400, 'Please input a valid campaign ID');
        return Response.send(res);
      } else if (!Number(accountno)) {
        Response.setError(400, 'Please input a valid campaign ID');
        return Response.send(res);
      }
      const bankAccount = await db.BankAccount.findOne({
        where: {UserId: req.user.id, account_number: accountno}
      });
      const userWallet = await WalletService.findUserCampaignWallet(
        req.user.id,
        campaignId
      );
      const campaignWallet = await WalletService.findSingleWallet({
        CampaignId: campaignId,
        UserId: null
      });
      if (!bankAccount) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          "User Dos'nt Have a Bank Account"
        );
        return Response.send(res);
      }
      if (!userWallet) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'User Wallet Not Found'
        );
        return Response.send(res);
      }
      if (!campaignWallet) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign Wallet Not Found'
        );
        return Response.send(res);
      }
      if (!userWallet.balance > campaignWallet.balance) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Insufficient Fund'
        );
        return Response.send(res);
      }
      if (userWallet.balance < amount) {
        Response.setSuccess(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient Wallet Balance'
        );
        return Response.send(res);
      }

      await QueueService.fundBeneficiaryBankAccount(
        bankAccount,
        campaignWallet,
        userWallet,
        req.user.id,
        amount
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Transaction Processing'
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.' + error
      );
      return Response.send(res);
    }
  }

  static async vendorWithdrawFromBankAccount(req, res) {
    const {amount, accountno} = req.params;
    try {
      if (!Number(amount)) {
        Response.setError(400, 'Please input a valid amount');
        return Response.send(res);
      }
      if (!Number(accountno)) {
        Response.setError(400, 'Please input a valid account number');
        return Response.send(res);
      }
      const bankAccount = await db.BankAccount.findOne({
        where: {UserId: req.user.id, account_number: accountno}
      });
      const userWallet = await db.Wallet.findOne({
        where: {UserId: req.user.id}
      });

      if (!bankAccount) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          "User Dos'nt Have a Bank Account"
        );
        return Response.send(res);
      }
      if (!userWallet) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'User Wallet Not Found'
        );
        return Response.send(res);
      }
      // if (userWallet.balance < amount) {
      //   Response.setSuccess(
      //     HttpStatusCode.STATUS_BAD_REQUEST,
      //     'Insufficient Wallet Balance'
      //   );
      //   return Response.send(res);
      // }
      await QueueService.fundVendorBankAccount(
        bankAccount,
        userWallet,
        req.user.id,
        amount
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Transaction Processing'
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.' + error
      );
      return Response.send(res);
    }
  }

  static async createTicket(req, res) {
    const {email, subject, phone, description} = req.body;
    // const rules = {
    //     subject: "required|alpha",
    //     description: "required|alpha",
    //     phone: ['required','regex:/^([0|\+[0-9]{1,5})?([7-9][0-9]{9})$/'],
    //     email: 'email|required',
    // }

    try {
      // const validation = new Validator(req.body, rules);
      // if (validation.fails()) {
      //   Response.setError(422, validation.errors);
      //   return Response.send(res);
      // } else {

      const crypto = await AwsUploadService.encrypt('jibril');
      console.log(crypto);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error' + error
      );
      return Response.send(res);
    }
  }

  static async changePassword(req, res) {
    try {
      const user = req.user;
      const {old_password, new_password} = SanitizeObject(req.body, [
        'old_password',
        'new_password'
      ]);

      if (!compareHash(old_password, user.password)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid old password'
        );
        return Response.send(res);
      }

      const password = createHash(new_password);
      await UserService.update(user.id, {
        password
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Password changed.');
      return Response.send(res);
    } catch (error) {
      console.log('ChangePassword', error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Password update failed. Please retry.'
      );
      return Response.send(res);
    }
  }
}

function getDifference(dob) {
  today = new Date();
  past = new Date(dob); // remember this is equivalent to 06 01 2010
  //dates in js are counted from 0, so 05 is june
  var diff = Math.floor(today.getTime() - dob.getTime());
  var day = 1000 * 60 * 60 * 24;

  var days = Math.floor(diff / day);
  var months = Math.floor(days / 31);
  var years = Math.floor(months / 12);

  return years;
}

module.exports = UsersController;
