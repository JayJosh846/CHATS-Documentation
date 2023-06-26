const db = require('../models');
var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const util = require('../libs/Utils');
const {sequelize} = require('../models');
// const sequelize = require('sequelize');
class NgoAuthController {
  constructor() {
    this.emails = [];
  }
  static async dummyData() {
    return {
      transactions: [
        {
          transactionId: 'BNBFFGDG-FBBH-345623412',
          amount: 12329870,
          userId: 2,
          status: 'Pending',
          type: 'CR',
          narration: 'Paying Vendors',
        },
        {
          transactionId: 'CNBFGGDG-FGGH-345623412',
          amount: 52129870,
          userId: 2,
          status: 'Sucessful',
          type: 'DR',
          narration: 'Paying Beneficiaries',
        },
        {
          transactionId: 'DNBFGGDG-FAAH-345623412',
          amount: 62329870,
          userId: 5,
          status: 'Succesful',
          type: 'CR',
          narration: 'Paying Vendors',
        },
        {
          transactionId: 'EANBFGGDG-FCCH-345623412',
          amount: 92329870,
          userId: 4,
          status: 'Pending',
          type: 'DR',
          narration: 'Paying Vendors',
        },
        {
          transactionId: 'FNBFGGDG-FDDH-345623412',
          amount: 12329870,
          userId: 2,
          status: 'Pending',
          type: 'CR',
          narration: 'Paying Vendors',
        },
        {
          transactionId: 'ANBFFGDG-FBBH-345623412',
          amount: 12329870,
          userId: 2,
          status: 'Pending',
          type: 'CR',
          narration: 'Paying Vendors',
        },
        {
          transactionId: 'GNBFGGDG-FGGH-345623412',
          amount: 52129870,
          userId: 2,
          status: 'Sucessful',
          type: 'DR',
          narration: 'Paying Beneficiaries',
        },
        {
          transactionId: 'JNBFGGDG-FAAH-345623412',
          amount: 62329870,
          userId: 5,
          status: 'Succesful',
          type: 'CR',
          narration: 'Paying Vendors',
        },
        {
          transactionId: 'INBFGGDG-FCCH-345623412',
          amount: 92329870,
          userId: 4,
          status: 'Pending',
          type: 'DR',
          narration: 'Paying Vendors',
        },
        {
          transactionId: 'ZNBFGGDG-FDDH-345623412',
          amount: 12329870,
          userId: 2,
          status: 'Pending',
          type: 'CR',
          narration: 'Paying Vendors',
        },
      ],
      beneficiaries: [
        {
          id: 44,
          first_name: 'Chloe',
          last_name: 'Sullivan',
          gender: 'Female',
          marital_status: 'Single',
          phone: '2348064652233',
        },
        {
          id: 33,
          first_name: 'Lex',
          last_name: 'Luthor',
          gender: 'Male',
          marital_status: 'Single',
          phone: '2348065652143',
        },
        {
          id: 14,
          first_name: 'Louis',
          last_name: 'Lane',
          gender: 'Female',
          marital_status: 'Single',
          phone: '2348065652213',
        },
        {
          id: 15,
          first_name: 'Oliver',
          last_name: 'Quin',
          gender: 'Male',
          marital_status: 'Single',
          phone: '2348065652211',
        },
        {
          id: 36,
          first_name: 'Martha',
          last_name: 'Kent',
          gender: 'Female',
          marital_status: 'Divorce',
          phone: '2348065652233',
        },
        {
          id: 52,
          first_name: 'Wande',
          last_name: 'Fish',
          gender: 'Male',
          marital_status: 'Single',
          phone: '2348065652233',
        },
        {
          id: 63,
          first_name: 'Wakaman',
          last_name: 'Zakanda',
          gender: 'Female',
          marital_status: 'Single',
          phone: '2348065652233',
        },
        {
          id: 74,
          first_name: 'Lami',
          last_name: 'Zior',
          gender: 'Male',
          marital_status: 'Married',
          phone: '2348065652213',
        },
        {
          id: 15,
          first_name: 'Clarke',
          last_name: 'Kent',
          gender: 'Male',
          marital_status: 'Single',
          phone: '2348065652211',
        },
        {
          id: 66,
          first_name: 'Lana',
          last_name: 'Lang',
          gender: 'Female',
          marital_status: 'Single',
          phone: '2348065652233',
        },
      ],
      complaint: [
        {
          title: 'Low Garri In Circulation',
          status: 'Pending',
          userId: 23,
        },
        {
          title: 'Poor Services',
          status: 'Pending',
          userId: 23,
        },
        {
          title: 'Payment Failure',
          status: 'InProgress',
          userId: 23,
        },
        {
          title: 'Cash Not Received',
          status: 'InProgress',
          userId: 23,
        },
        {
          title: 'Small Rice Served For Lunch',
          status: 'InProgress',
          userId: 23,
        },
        {
          title: 'Payment Suspension',
          status: 'Closed',
          userId: 23,
        },
        {
          title: 'Vendors Poor Services',
          status: 'Closed',
          userId: 23,
        },
      ],
      campaign: [
        {
          title: 'Feeding IDP Camp',
          description: 'Feeding IDP Camp',
          budget: '456890000',
          start_date: '12-01-2020',
          location: '',
          end_date: '31-12-2021',
        },
        {
          title: 'Laptop For Girl Child',
          description: 'Buying Of Laptop for Girl Child in Africa',
          budget: '656890000',
          start_date: '12-01-2021',
          location: '',
          end_date: '31-12-2021',
        },
        {
          title: 'War Against Marternal Mortality',
          description: 'The Aim is to Reduce Mertanal Mortality Rate',
          budget: '456890000',
          start_date: '12-01-2020',
          location: '',
          end_date: '31-12-2021',
        },
        {
          title: 'Feeding IDP Camp',
          description: 'Feeding IDP Camp',
          budget: '456890000',
          start_date: '12-01-2020',
          location: '',
          end_date: '31-12-2021',
        },
        {
          title: 'Antigraft War',
          description: 'War against Some Crazy Things Around',
          budget: '556890000',
          start_date: '12-01-2020',
          location: '',
          end_date: '31-12-2021',
        },
        {
          title: 'Child Education in Africa',
          description: 'Operation Train and Educate African Child',
          budget: '656890000',
          start_date: '12-01-2020',
          location: '',
          end_date: '31-12-2021',
        },
      ],
      balance: 456788809,
      disbursed: 9877737373,
      beneficiariesCount: 45690,
      genderStat: [
        {
          gender: 'Male',
          count: 45321,
        },
        {
          gender: 'Female',
          count: 55321,
        },
        {
          gender: 'Male',
          count: 45321,
        },
        {
          gender: 'Unknow',
          count: 321,
        },
      ],
      ageStat: [
        {
          age: '1-17',
          count: 5600,
        },
        {
          age: '18-30',
          count: 15600,
        },
        {
          age: '31-39',
          count: 16320,
        },
        {
          age: '40-Above',
          count: 5600,
        },
      ],
    };
  }
  static async dashboard(req, res) {
    try {
      /*
                const OrganisationId = (req.body.OrganisationId) + "";
                const transactions = await db.Transaction.findAll({ where: { UserId: OrganisationId } });
                const beneficiaries = await db.User.findAll({ where: { OrganisationId: OrganisationId, RoleId: 5 } });
                const campaings = await db.Campaign.findAll({ where: { OrganisationId: OrganisationId } });
                const balance = 0;
                const disbursed = await db.Transaction.sum('amount', { where: { senderId: OrganisationId, type: 'DR' } });
                const beneficiariesCount = await db.User.count({ where: { OrganisationId: OrganisationId, RoleId: 5 } });
                const genderStat = await db.User.findAll({
                    attributes: ['gender', [sequelize.fn('count', sequelize.col('gender')), 'cnt']], group: ['gender'],
                });
    
                const complaint = await NgoAuthController.dummyData();
                const data = {
                    balance: balance,
                    disbursed: disbursed,
                    beneficiariesCount: beneficiariesCount,
                    transactions: transactions,
                    beneficiaries: beneficiaries,
                    campaings: campaings,
                    complaint: complaint
                };
                */
      const data = await NgoAuthController.dummyData();
      util.setSuccess(200, 'Data Retrieved Successfully', data);
      return util.send(res);
    } catch (error) {
      util.setError(500, error);
      return util.send(res);
    }
  }
  static async getAllNgos(req, res) {}

  static async createUser(req, res, next) {
    try {
      const {
        name,
        email,
        phone,
        password,
        contact_address,
        contact_name,
        contact_phone,
        location,
        logo_link,
      } = req.body;
      //check if email already exist
      db.User.findOne({
        where: {
          email: req.body.email,
        },
      })
        .then(user => {
          if (user !== null) {
            util.setError(400, 'Email Already Exists, Recover Your Account');
            return util.send(res);
          }
          db.Organisations.create({
            name: name,
            email: email,
            phone: phone,
            contact_address: contact_address,
            contact_name: contact_name,
            contact_phone: contact_phone,
            location: location,
            is_individual: false,
            logo_link: logo_link,
          })
            .then(organisation => {
              bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(req.body.password, salt).then(hash => {
                  const encryptedPassword = hash;
                  const balance = 0.0;
                  return db.User.create({
                    RoleId: 3,
                    OrganisationId: organisation.id,
                    first_name: name,
                    last_name: name,
                    phone: phone,
                    email: email,
                    password: encryptedPassword,
                    gender: '',
                    marital_status: '',
                    balance: balance,
                    bvn: '',
                    status: 1,
                    location: location,
                    address: contact_address,
                    referal_id: '',
                    pin: '',
                    last_login: new Date(),
                  })
                    .then(user => {
                      util.setSuccess(
                        201,
                        'Account Successfully Created',
                        user.id,
                      );
                      return util.send(res);
                    })
                    .catch(err => {
                      console.log(err);
                      util.setError(500, err);
                      return util.send(res);
                    });
                });
              });
            })
            .catch(err => {
              console.log('NGO not created');
              console.log(err);
              util.setError(500, err);
              return util.send(res);
            });
        })
        .catch(err => {
          util.setError(500, err);
          return util.send(res);
        });
    } catch (error) {
      util.setError(500, error);
      return util.send(res);
    }
  }
  static async signIn(req, res, next) {
    try {
      const {email, password} = req.body;
      db.User.findOne({
        where: {
          email: email,
          RoleId: 3,
        },
      })
        .then(user => {
          bcrypt
            .compare(password, user.password)
            .then(valid => {
              //compare password of the retrieved value
              if (!valid) {
                //if not valid throw this error
                const error = new Error('Invalid Login Credentials');
                util.setError(401, error);
                return util.send(res);
              }
              // console.log(user)
              const token = jwt.sign(
                {
                  userId: user.id,
                  OrganisationId: user.OrganisationId,
                  RoleId: user.RoleId,
                },
                process.env.SECRET_KEY,
                {
                  expiresIn: '24hr',
                },
              );
              const resp = {
                userId: user.id,
                token: token,
              };
              util.setSuccess(200, 'Login Successful', resp);
              return util.send(res);
            })
            .catch(error => {
              util.setError(500, error);
              return util.send(res);
            });
        })
        .catch(err => {
          util.setError(404, 'Invalid Login Credentials');
          return util.send(res);
        });
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }
  static async userDetails(req, res, next) {
    const id = req.params.id;
    try {
      db.User.findOne({
        where: {
          id: id,
        },
      })
        .then(user => {
          util.setSuccess(200, 'Got Users Details', user);
          return util.send(res);
        })
        .catch(err => {
          util.setError(404, 'Users Record Not Found', err);
          return util.send(res);
        });
    } catch (error) {
      util.setError(404, 'Users Record Not Found', error);
      return util.send(res);
    }
  }
  static async resetPassword(req, res, next) {
    const email = req.body.email;
    //check if users exist in the db with email address
    db.User.findOne({
      where: {
        email: email,
      },
    })
      .then(user => {
        //reset users email password
        if (user !== null) {
          //if there is a user
          //generate new password
          const newPassword = 'H@b552baba';
          //update new password in the db
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newPassword, salt).then(hash => {
              const role_id = 2;
              const encryptedPassword = hash;
              const balance = 0.0;
              return db.User.update(
                {
                  password: encryptedPassword,
                },
                {
                  where: {
                    email: email,
                  },
                },
              ).then(updatedRecord => {
                //mail user a new password
                //respond with a success message
                res.status(201).json({
                  status: 'success',
                  message:
                    'An email has been sent to the provided email address, kindly login to your email address to continue',
                });
              });
            });
          });
        }
      })
      .catch(err => {
        res.status(404).json({
          status: 'error',
          error: err,
        });
      });
  }
  static async updateProfile(req, res, next) {
    const {firstName, lastName, email, phone} = req.body;
    const userId = req.body.userId;
    db.User.findOne({
      where: {
        id: userId,
      },
    })
      .then(user => {
        if (user !== null) {
          //if there is a user
          return db.User.update(
            {
              firstName: firstName,
              lastName: lastName,
              phone: phone,
            },
            {
              where: {
                id: userId,
              },
            },
          ).then(updatedRecord => {
            //respond with a success message
            res.status(201).json({
              status: 'success',
              message: 'Profile Updated Successfully!',
            });
          });
        }
      })
      .catch(err => {
        res.status(404).json({
          status: 'error',
          error: err,
        });
      });
  }
  static async updatePassword() {
    const {oldPassword, newPassword, confirmedPassword} = req.body;
    if (newPassword !== confirmedPassword) {
      return res.status(419).json({
        status: error,
        error: new Error('New Password Does not Match with Confirmed Password'),
      });
    }
    const userId = req.body.userId;
    db.User.findOne({
      where: {
        id: userId,
      },
    })
      .then(user => {
        bcrypt
          .compare(oldPassword, user.password)
          .then(valid => {
            if (!valid) {
              return res.status(419).json({
                status: error,
                error: new Error('Existing Password Error'),
              });
            }
            //update new password in the db
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(newPassword, salt).then(hash => {
                const role_id = 2;
                const encryptedPassword = hash;
                const balance = 0.0;
                return db.User.update(
                  {
                    password: encryptedPassword,
                  },
                  {
                    where: {
                      email: email,
                    },
                  },
                ).then(updatedRecord => {
                  //mail user a new password
                  //respond with a success message
                  res.status(201).json({
                    status: 'success',
                    message:
                      'An email has been sent to the provided email address, kindly login to your email address to continue',
                  });
                });
              });
            });
          })
          .catch(err => {
            //the two password does not match
            return res.status(419).json({
              status: error,
              error: new Error('Existing Password Error'),
            });
          });
      })
      .catch(err => {
        res.status(404).json({
          status: 'error',
          error: err,
        });
      });
  }
}

module.exports = NgoAuthController;
