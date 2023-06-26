const db = require('../models');
var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const util = require('../libs/Utils');
const VendorServices = require('../services/VendorService');
const {data} = require('../libs/Utils');
const {Message} = require('@droidsolutions-oss/amqp-ts');
var amqp_1 = require('./../libs/RabbitMQ/Connection');

var queue = amqp_1['default'].declareQueue('createWallet', {
  durable: true,
});

const Validator = require('validatorjs');

class VendorsAuthController {
  constructor() {
    this.emails = [];
  }
  // static async getAllVendors(req, res) {
  //     try {
  //         const allVendors = await VendorServices.getAllVendors();
  //         // if (allVendors.length > 0) {
  //         //     util.setSuccess(200, 'Vendors retrieved', allVendors);
  //         // } else {
  //         //     util.setSuccess(200, 'No Vendors found');
  //         // }
  //         // console.log(allVendors);
  //         util.setSuccess(200, 'Vendors retrieved', allVendors);
  //         return util.send(res);
  //     } catch (error) {
  //         // console.log(error)
  //         util.setError(400, error);
  //         return util.send(res);
  //     }
  // }
  // static async getAVendor(req, res) {
  //     const { id } = req.params;

  //     // if (!Number(id)) {
  //     //     util.setError(400, 'Please input a valid numeric value');
  //     //     return util.send(res);
  //     // }

  //     try {
  //         const aVendor = await VendorServices.getAVendor(id);

  //         if (!aVendor) {
  //             util.setError(404, `Cannot find Vendor with the id ${id}`);
  //         } else {
  //             util.setSuccess(200, 'Vendors Record Found', aVendor);
  //         }
  //         return util.send(res);
  //     } catch (error) {
  //         util.setError(404, error);
  //         return util.send(res);
  //     }
  // }

  static async createUser(req, res, next) {
    try {
      const {
        first_name,
        last_name,
        email,
        phone,
        password,
        address,
        store_name,
        country,
        state,
        coordinates,
      } = req.body;
      //check if email already exist

      const rules = {
        first_name: 'required',
        address: 'required',
        store_name: 'required',
        email: 'email|required',
        password: 'required',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        country: 'string|required',
        state: 'string|required',
      };

      const validation = new Validator(req.body, rules);

      if (validation.fails()) {
        util.setError(422, validation.errors);
        return util.send(res);
      }
      db.User.findOne({
        where: {
          email,
        },
      })
        .then(user => {
          if (!!user) {
            util.setError(400, 'Email Already Exists, Recover Your Account');
            return util.send(res);
          }
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt).then(encryptedPassword => {
              return db.User.create({
                RoleId: 4,
                OrganisationId: 2,
                first_name: first_name,
                last_name: last_name,
                phone: phone,
                email: email,
                password: encryptedPassword,
                location: JSON.stringify({country, state, coordinates}),
                address: address,
                last_login: new Date(),
              })
                .then(async account => {
                  await account.createStore({
                    store_name: store_name,
                    address: address,
                    location: JSON.stringify({country, state, coordinates}),
                  });
                  queue.send(
                    new Message(
                      {
                        id: account.id,
                        type: 'user',
                      },
                      {
                        contentType: 'application/json',
                      },
                    ),
                  );
                  util.setSuccess(
                    201,
                    'Account Successfully Created',
                    account.id,
                  );
                  return util.send(res);
                })
                .catch(error => {
                  console.log('Could not save to db');
                  console.log(error);
                  util.setError(500, error);
                  return util.send(res);
                });
            });
          });
        })
        .catch(err => {
          console.log(err);
          util.setError(500, err);
          return util.send(res);
        });
    } catch (error) {
      util.setError(500, error);
      return util.send(res);
    }
    // try {
    //     const { name, email, phone, password, address, store_name, location } = req.body;
    //     //check if email already exist
    //     db.User.findOne({
    //         where: { email: req.body.email }
    //     }).then(user => {
    //         if (user !== null) {
    //             util.setError(400, "Email Already Exists, Recover Your Account");
    //             return util.send(res);
    //         }
    //         bcrypt.genSalt(10, (err, salt) => {
    //             bcrypt.hash(req.body.password, salt).then(hash => {
    //                 const encryptedPassword = hash;
    //                 const balance = 0.00;
    //                 db.User.create({
    //                     RoleId: 4,
    //                     OrganisationId: 2,
    //                     first_name: name,
    //                     last_name: name,
    //                     phone: phone,
    //                     email: email,
    //                     password: encryptedPassword,
    //                     gender: '',
    //                     marital_status: '',
    //                     balance: balance,
    //                     bvn: '',
    //                     status: 1,
    //                     location: location,
    //                     address: address,
    //                     referal_id: '',
    //                     pin: '',
    //                     last_login: (new Date())
    //                 }).then(user => {
    //                     util.setSuccess(201, "Vendors' Account Created Successfully Created", user);
    //                     return util.send(res);
    //                 }).catch(err => {
    //                     util.setError(500, err);
    //                     return util.send(res);
    //                 });
    //             });
    //         }).catch(err => {
    //             console.log('Vendors Account Could not be created');
    //             console.log(err);
    //             util.setError(500, err);
    //             return util.send(res);
    //         });
    //     }).catch(err => {
    //         util.setError(500, err);
    //         return util.send(res);
    //     });
    // } catch (error) {
    //     util.setError(500, error);
    //     return util.send(res);
    // }
  }

  static async signIn(req, res, next) {
    try {
      const {email, password} = req.body;
      db.User.findOne({
        where: {
          email: email,
          RoleId: 4,
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
              const token = jwt.sign(
                {
                  userId: user.id,
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
          util.setError(401, 'Invalid Login Credentials');
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
          const newPassword = util.generatePassword();
          //update new password in the db
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newPassword, salt).then(hash => {
              const encryptedPassword = hash;
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
    const {firstName, lastName, phone} = req.body;
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

module.exports = VendorsAuthController;
