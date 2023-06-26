const {Op} = require('sequelize');
const {
  AclRoles,
  OrgRoles,
  createHash,
  HttpStatusCode,
  generateOrganisationId,
  encryptData
} = require('../utils');
const {Message} = require('@droidsolutions-oss/amqp-ts');
const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {Response, Logger, Axios} = require('../libs');
const {Beneficiary, Invites} = require('../models');
const Validator = require('validatorjs');
const formidable = require('formidable');
const uploadFile = require('./AmazonController');
const readXlsxFile = require('read-excel-file/node');
const axios = require('axios');
const AuthService = require('../services/AuthService');
const amqp_1 = require('./../libs/RabbitMQ/Connection');
const {
  UserService,
  QueueService,
  MailerService,
  OrganisationService,
  CampaignService,
  WalletService,
  BlockchainService
} = require('../services');
const BeneficiariesService = require('../services/BeneficiaryService');
const ninVerificationQueue = amqp_1['default'].declareQueue(
  'nin_verification',
  {
    durable: true
  }
);
const createWalletQueue = amqp_1['default'].declareQueue('createWallet', {
  durable: true
});
const __basedir = __dirname + '/..';
const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';

class AuthController {
  static async verifyNin(req, res) {
    const data = req.body;

    const user = await db.User.findByPk(data.userId);
    if (user) {
      if (user.nin == null) {
        Response.setError(422, 'User has not supplied Nin Number');
        return Response.send(res);
      }
      ninVerificationQueue.send(
        new Message(user, {
          contentType: 'application/json'
        })
      );
      Response.setError(200, 'User Verification Initialised');
      return Response.send(res);
    } else {
      Response.setError(400, 'Invalid User');
      return Response.send(res);
    }
  }

  static async userDetails(req, res, next) {
    const id = req.params.id;
    try {
      db.User.findOne({
        where: {
          id: id
        }
      })
        .then(user => {
          Response.setSuccess(200, 'Got Users Details', user);
          return Response.send(res);
        })
        .catch(err => {
          Response.setError(404, 'Users Record Not Found', err);
          return Response.send(res);
        });
    } catch (error) {
      Response.setError(404, 'Users Record Not Found', error);
      return Response.send(res);
    }
  }

  static async updateProfile(req, res, next) {
    const {firstName, lastName, email, phone} = req.body;
    const userId = req.body.userId;
    db.User.findOne({
      where: {
        id: userId
      }
    })
      .then(user => {
        if (user !== null) {
          //if there is a user
          return db.User.update(
            {
              firstName: firstName,
              lastName: lastName,
              phone: phone
            },
            {
              where: {
                id: userId
              }
            }
          ).then(updatedRecord => {
            res.status(201).json({
              status: 'success',
              message: 'Profile Updated Successfully!'
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
  }
  static async beneficiariesExcel(req, res) {
    try {
      if (req.file == undefined) {
        Response.setError(404, 'Please upload an excel file!', err);
        return Response.send(res);
      }
      const {campaignId} = req.body;

      const campaignExist = await db.Campaign.findOne({
        where: {id: campaignId}
      });

      if (!campaignExist) {
        console.log('Campaign not found');
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid Campaign ID'
        );
        return Response.send(res);
      }
      let path = __basedir + '/beneficiaries/upload/' + req.file.filename;
      let existingEmails = []; //existings
      let createdSuccess = []; //successfully created
      let createdFailed = []; //failed to create
      readXlsxFile(path).then(rows => {
        // skip header or first row
        rows.shift();
        let beneficiaries = [];
        const encryptedPin = createHash('0000');
        //loop through the file
        rows.forEach(row => {
          let beneficiary = {
            first_name: row[0],
            last_name: row[1],
            email: row[2],
            phone: row[3],
            gender: row[4],
            address: row[5],
            location: row[6],
            dob: row[7],
            RoleId: AclRoles.Beneficiary,
            pin: encryptedPin,
            password: 'password',
            status: 'activated'
          };
          beneficiaries.push(beneficiary);
        });

        //loop through all the beneficiaries list to populate them in the db
        beneficiaries.forEach(async beneficiary => {
          const user_exist = await db.User.findOne({
            where: {email: beneficiary.email}
          });

          if (!user_exist) {
            bcrypt.genSalt(10, (err, salt) => {
              if (err) {
                console.log('Error Ocurred hashing');
              }
              const encryptedPin = createHash('0000'); //createHash(fields.pin);//set pin to zero 0
              bcrypt
                .hash(beneficiary.password, salt)
                .then(async hash => {
                  const encryptedPassword = hash;
                  const user = await db.User.create({
                    RoleId: AclRoles.Beneficiary,
                    first_name: beneficiary.first_name,
                    last_name: beneficiary.last_name,
                    phone: beneficiary.phone,
                    email: beneficiary.email,
                    password: encryptedPassword,
                    gender: beneficiary.gender,
                    status: 'activated',
                    location: beneficiary.location,
                    address: beneficiary.address,
                    referal_id: beneficiary.referal_id,
                    dob: beneficiary.dob,
                    pin: encryptedPin
                  });
                  if (user) {
                    await QueueService.createWallet(user.id, 'user');
                    if (campaignExist.type === 'campaign') {
                      const benef = await Beneficiary.create({
                        UserId: user.id,
                        CampaignId: campaignExist.id,
                        approved: true,
                        source: 'Excel File Upload'
                      });
                      if (benef) {
                        await QueueService.createWallet(
                          user.id,
                          'user',
                          fields.campaign
                        );
                      }
                    }
                  }
                  createdSuccess.push(beneficiary.email); //add to success list
                  Response.setSuccess(
                    200,
                    'Beneficiaries Uploaded Successfully:',
                    user.id
                  );
                  return Response.send(res);
                })
                .catch(err => {
                  Response.setError(
                    HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
                    err
                  );
                  // return Response.send(res);
                  createdFailed.push(beneficiary.email);
                });
            });
          } else {
            //include the email in the existing list
            existingEmails.push(beneficiary.email);
          }
        });
        Response.setSuccess(
          200,
          'Beneficiaries Uploaded Successfully:',
          createdSuccess
        );
        return Response.send(res);
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: 'Fail to import Beneficairies into database!',
        error: error.message
      });
    }
  }

  static async beneficiariesKoboToolBox(req, res) {
    const url = req.body.url;
    const token = req.body.token;
    const campaignId = req.body.campaign;
    try {
      let campaignExist = await db.Campaign.findOne({
        where: {
          id: campaignId,
          type: 'campaign'
        }
      });
      if (!campaignExist) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Invalid Campaign ID'
        );
        return Response.send(res);
      }
      const kTBoxURL = 'https://[kpi]/api/v2/assets/' + token + '.json';
      const beneficiaries = [];
      //fetch from their url
      const results = await axios.get(kTBoxURL);
      if (results.status === 400) {
        Response.setError(400, results.message);
        return Response.send(res);
      }
      //read into json
      results.data.forEach(row => {
        let beneficiary = {
          first_name: row[0],
          last_name: row[1],
          email: row[2],
          phone: row[3],
          gender: row[4],
          address: row[5],
          location: row[6],
          dob: row[7],
          RoleId: AclRoles.Beneficiary,
          pin: encryptedPin,
          password: 'password',
          status: 'activated'
        };
        beneficiaries.push(beneficiary);
      });

      //loop through all the beneficiaries list to populate them in the db
      beneficiaries.forEach(async beneficiary => {
        const user_exist = await db.User.findOne({
          where: {
            email: beneficiary.email
          }
        });
        if (user_exist) {
          //include the email in the existing list
          existingEmails.push(beneficiary.email);
        } else {
          bcrypt.genSalt(10, (err, salt) => {
            if (err) {
              console.log('Error Ocurred hashing');
            }
            const encryptedPin = createHash('0000'); //createHash(fields.pin);//set pin to zero 0
            bcrypt
              .hash(beneficiary.password, salt)
              .then(async hash => {
                const encryptedPassword = hash;
                await db.User.create({
                  RoleId: AclRoles.Beneficiary,
                  first_name: beneficiary.first_name,
                  last_name: beneficiary.last_name,
                  phone: beneficiary.phone,
                  email: beneficiary.email,
                  password: encryptedPassword,
                  gender: beneficiary.gender,
                  status: 'activated',
                  location: beneficiary.location,
                  address: beneficiary.address,
                  referal_id: beneficiary.referal_id,
                  dob: beneficiary.dob,
                  pin: encryptedPin
                }).then(async user => {
                  await QueueService.createWallet(user.id, 'user');
                  if (campaignExist.type === 'campaign') {
                    await Beneficiary.create({
                      UserId: user.id,
                      CampaignId: campaignExist.id,
                      approved: true,
                      source: 'Excel File Upload'
                    }).then(async () => {
                      await QueueService.createWallet(
                        user.id,
                        'user',
                        fields.campaign
                      );
                    });
                  }
                });
                createdSuccess.push(beneficiary.email); //add to success list
                Response.setSuccess(
                  200,
                  'Beneficiaries Uploaded Successfully:',
                  user.id
                );
                return Response.send(res);
              })
              .catch(err => {
                Response.setError(
                  HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
                  err.message
                );
                return Response.send(res);
                createdFailed.push(beneficiary.email);
              });
          });
        }
      });
      // send responses
      return Response.send(res);
    } catch (error) {
      console.error(error);
      Response.setError(500, 'On-boarding failed. Please try again later.');
    }
  }

  static async beneficiaryRegisterSelf(req, res) {
    try {
      const RoleId = AclRoles.Beneficiary;
      const {phone, email, country, state, coordinates, device_imei} = req.body;
      const files = req.file;
      const rules = {
        email: 'email|required',
        password: 'required',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        country: 'string|required',
        state: 'string|required',
        device_imei: 'string|required'
      };

      const validation = new Validator(req.body, rules);

      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        if (!files) {
        }
        const userByEmail = await db.User.findOne({where: {email}});
        const userDevice = await db.User.findOne({where: {device_imei}});
        if (userByEmail) {
          Response.setError(400, 'User With This Email Exist');
          return Response.send(res);
        }
        if (userDevice) {
          Response.setError(400, 'device already registered');
          return Response.send(res);
        } else {
          const password = createHash(req.body.password);

          const extension = req.file.mimetype.split('/').pop();

          const profile_pic = await uploadFile(
            files,
            'u-' + environ + '-' + email + '-i.' + extension,
            'convexity-profile-images'
          );

          const user = await UserService.addUser({
            RoleId,
            phone,
            email,
            password,
            profile_pic,
            location: JSON.stringify({country, state, coordinates})
          });

          if (user) await QueueService.createWallet(user.id, 'user');
          Response.setSuccess(201, 'Account Onboarded Successfully', user);
          return Response.send(res);
        }
      }
    } catch (error) {
      Response.setError(500, 'On-boarding failed. Please try again later.');
    }
  }

  static async sCaseCreateBeneficiary(req, res) {
    var form = new formidable.IncomingForm({
      multiples: true
    });
    form.parse(req, async (err, fields, files) => {
      fields['today'] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        email: 'email',
        referal_id: 'string',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        gender: 'required|in:male,female',
        address: 'string',
        location: 'string',
        password: 'required',
        dob: 'required|date|before:today',
        nfc: 'string',
        campaign: 'required|numeric'
        // pin: 'size:4|required' //pin validation disabled
      };

      const validation = new Validator(fields, rules);
      if (validation.fails()) {
        Logger.error(`Validation Error: ${JSON.stringify(validation.errors)}`);
        Response.setError(400, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      } else {
        if (files.profile_pic) {
          // const allowed_types = ['image/jpeg', 'image/png', 'image/jpg'];
          // if (!allowed_types.includes(files.profile_pic.type)) {
          //   Response.setError(400, "Invalid File type. Only jpg, png and jpeg files allowed for Profile picture");
          //   return Response.send(res);
          // }
        } else {
          Logger.error('Profile Pic Required');
          Response.setError(400, 'Profile Pic Required');
          return Response.send(res);
        }

        let campaignExist = await db.Campaign.findOne({
          where: {
            id: fields.campaign,
            type: 'campaign'
          }
        });

        if (!campaignExist) {
          Logger.error('Invalid Campaign');
          Response.setError(400, 'Invalid Campaign');
          return Response.send(res);
        }

        let ninExist = await db.User.findOne({
          where: {
            nin: fields.nin
          }
        });

        if (ninExist) {
          Response.setError(400, 'Nin has been taken');
          return Response.send(res);
        }

        if (fields.email) {
          const user_exist = await db.User.findOne({
            where: {
              email: fields.email
            }
          });
          if (user_exist) {
            Response.setError(
              400,
              'Email Already Exists, Recover Your Account'
            );
            return Response.send(res);
          }
        }
        const encryptedPin = createHash('0000'); //setting default pin to zero //createHash(fields.pin);
        bcrypt.genSalt(10, (err, salt) => {
          if (err) {
            console.log('Error Ocurred hashing');
          }
          bcrypt.hash(fields.password, salt).then(async hash => {
            const encryptedPassword = hash;
            await db.User.create({
              RoleId: AclRoles.Beneficiary,
              first_name: fields.first_name,
              last_name: fields.last_name,
              phone: fields.phone,
              email: fields.email ? fields.email : null,
              password: encryptedPassword,
              gender: fields.gender,
              nin: fields.nin,
              location: fields.location ? fields.location : null,
              address: fields.address,
              referal_id: fields.referal_id,
              nfc: fields.nfc,
              dob: fields.dob,
              pin: encryptedPin,
              iris: fields.iris
            })
              .then(async user => {
                await QueueService.createWallet(user.id, 'user');
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

                // ninVerificationQueue.send(
                //   new Message(user, {
                //     contentType: "application/json"
                //   })
                // );
                if (campaignExist.type === 'campaign') {
                  await Beneficiary.create({
                    UserId: user.id,
                    CampaignId: campaignExist.id,
                    approved: true,
                    source: 'field app'
                  }).then(async () => {
                    await QueueService.createWallet(
                      user.id,
                      'user',
                      fields.campaign
                    );
                  });
                }
                // const data = await encryptData(
                //   JSON.stringify({
                //     id: user.id,
                //     email: fields.email,
                //     phone: fields.phone
                //   })
                // );

                Response.setSuccess(
                  201,
                  'Account Onboarded Successfully',
                  user.id
                );
                return Response.send(res);
              })
              .catch(err => {
                Response.setError(500, err);
                return Response.send(res);
              });
          });
        });
      }
    });
  }

  static async createBeneficiary(req, res) {
    // ensure that creator of beneficiary belongs to the organisation that owns campaing
    var form = new formidable.IncomingForm({
      multiples: true
    });
    form.parse(req, async (err, fields, files) => {
      fields['today'] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        email: 'email',
        referal_id: 'string',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        gender: 'required|alpha|in:male,female',
        address: 'string',
        location: 'string',
        password: 'required',
        dob: 'required|date|before:today',
        nfc: 'string',
        campaign: 'required|numeric'
        // pin: 'size:4|required' //disabled for now
      };
      const validation = new Validator(fields, rules);
      if (validation.fails()) {
        Response.setError(400, validation.errors);
        return Response.send(res);
      } else {
        const allowed_types = ['image/jpeg', 'image/png', 'image/jpg'];

        if (!files.profile_pic) {
          Response.setError(400, 'Profile picture required');
          return Response.send(res);
        }
        if (files.fingerprints) {
          if (files.fingerprints.length >= 6) {
            var uploadFilePromises = [];
            let campaignExist = await db.Campaign.findOne({
              where: {
                id: fields.campaign,
                type: 'campaign'
              }
            });

            if (!campaignExist) {
              Response.setError(400, 'Invalid Campaign ID');
              return Response.send(res);
            }
            const user_exist = await db.User.findOne({
              where: {
                email: fields.email
              }
            });
            if (user_exist) {
              Response.setError(
                400,
                'Email Already Exists, Recover Your Account'
              );
              return Response.send(res);
            } else {
              bcrypt.genSalt(10, (err, salt) => {
                if (err) {
                  console.log('Error Ocurred hashing');
                }
                const encryptedPin = createHash('0000'); //createHash(fields.pin);//set pin to zero 0
                bcrypt.hash(fields.password, salt).then(async hash => {
                  const encryptedPassword = hash;
                  await db.User.create({
                    RoleId: AclRoles.Beneficiary,
                    first_name: fields.first_name,
                    last_name: fields.last_name,
                    phone: fields.phone,
                    email: fields.email,
                    password: encryptedPassword,
                    gender: fields.gender,
                    location: fields.location,
                    address: fields.address,
                    referal_id: fields.referal_id,
                    dob: fields.dob,
                    pin: encryptedPin,
                    iris: fields.iris
                  })
                    .then(async user => {
                      await QueueService.createWallet(user.id, 'user');

                      var i = 0;
                      files.fingerprints.forEach(async fingerprint => {
                        let ext = fingerprint.name.substring(
                          fingerprint.name.lastIndexOf('.') + 1
                        );
                        uploadFilePromises.push(
                          uploadFile(
                            fingerprint,
                            'u-' +
                              environ +
                              '-' +
                              user.id +
                              '-fp-' +
                              ++i +
                              '.' +
                              ext,
                            'convexity-fingerprints'
                          )
                        );
                      });
                      let extension = files.profile_pic.name.substring(
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
                      Promise.all(uploadFilePromises).then(responses => {
                        responses.forEach(async url => {
                          await user.createPrint({
                            url: url
                          });
                        });
                      });
                      if (campaignExist.type === 'campaign') {
                        await Beneficiary.create({
                          UserId: user.id,
                          CampaignId: campaignExist.id,
                          approved: true,
                          source: 'field app'
                        }).then(async () => {
                          await QueueService.createWallet(
                            user.id,
                            'user',
                            fields.campaign
                          );
                        });
                      }

                      Response.setSuccess(
                        201,
                        'Account Onboarded Successfully',
                        user.id
                      );
                      return Response.send(res);
                    })
                    .catch(err => {
                      Response.setError(500, err.message);
                      return Response.send(res);
                    });
                });
              });
            }
          } else {
            Response.setError(400, 'Minimum of 6 Fingerprints Required');
            return Response.send(res);
          }
        } else {
          Response.setError(400, 'Fingerprints Required');
          return Response.send(res);
        }
      }
    });
  }

  static async createN(req, res) {
    try {
    } catch (error) {}
  }

  static async createNgoAccount(req, res) {
    let user = null;
    const data = req.body;
    const rules = {
      first_name: 'alpha',
      last_name: 'alpha',
      organisation_name: 'string',
      registration_id: 'string',
      email: 'required|email',
      password: 'required',
      website_url: 'url',
      registration_type: 'required|in:individual,organisation'
    };
    const validation = new Validator(data, rules, {
      url: 'Only valid url with https or http allowed'
    });
    if (validation.fails()) {
      Response.setError(400, validation.errors);
      return Response.send(res);
    } else {
      const email = data.email;
      // if (email.match(new RegExp(re))) {
      const userExist = await db.User.findOne({
        where: {
          email: data.email
        }
      });
      if (!userExist) {
        bcrypt.genSalt(10, (err, salt) => {
          if (err) {
            console.log('Error Ocurred hashing');
          }
          bcrypt.hash(data.password, salt).then(async hash => {
            const encryptedPassword = hash;

            if (data.registration_type === 'individual') {
              await db.User.create({
                RoleId: AclRoles.NgoAdmin,
                first_name: data.first_name,
                last_name: data.last_name,
                phone: data.phone,
                email: data.email,
                registration_type: 'individual',
                password: encryptedPassword
              }).then(async _user => {
                user = _user;
                await db.Organisation.create({
                  email: data.email
                })
                  .then(async organisation => {
                    await QueueService.createWallet(
                      organisation.id,
                      'organisation'
                    );
                    await organisation.createMember({
                      UserId: user.id,
                      role: OrgRoles.Admin
                    });
                  })
                  .catch(err => {
                    Response.setError(500, err);
                    return Response.send(res);
                  });
              });
            }

            if (data.registration_type === 'organisation') {
              const url_string = data.website_url;
              // const domain = url_string ? extractDomain(url_string) : '';
              // const re = '(\\W|^)[\\w.\\-]{0,25}@' + domain + '(\\W|$)';

              // const orgName = await db.Organisation.findOne({
              //   where: {
              //     name: data.organisation_name
              //   }
              // });
              // const orgWebsiteUrl = await db.Organisation.findOne({
              //   where: {
              //     website_url: data.website_url
              //   }
              // });

              // if (orgWebsiteUrl) {
              //   Response.setError(400, 'website url already exist');
              //   return Response.send(res);
              // }
              // if (orgName) {
              //   Response.setError(
              //     400,
              //     'An Organisation with such name already exist'
              //   );
              //   return Response.send(res);
              // }

              await db.User.create({
                RoleId: AclRoles.NgoAdmin,
                email: data.email,
                password: encryptedPassword,
                registration_type: 'organisation'
              })
                .then(async _user => {
                  user = _user;
                  //QueueService.createWallet(user.id, 'user');
                  await db.Organisation.create({
                    name: data.organisation_name,
                    email: data.email,
                    website_url: data.website_url || null,
                    registration_id: data.registration_id
                  }).then(async organisation => {
                    await QueueService.createWallet(
                      organisation.id,
                      'organisation'
                    );
                    await organisation.createMember({
                      UserId: user.id,
                      role: OrgRoles.Admin
                    });
                  });
                })
                .catch(err => {
                  Response.setError(500, err);
                  return Response.send(res);
                });
            }
            const token = jwt.sign(
              {email: data.email},
              process.env.SECRET_KEY,
              {expiresIn: '24hr'}
            );
            const verifyLink =
              data.host_url + '/email-verification?confirmationCode=' + token;

            const sent = await MailerService.sendEmailVerification(
              data.email,
              data.organisation_name || data.first_name + ' ' + data.last_name,
              verifyLink
            );
            Response.setSuccess(201, 'NGO and User registered successfully', {
              user: user.toObject()
            });
            return Response.send(res);
          });
        });
      } else {
        Response.setError(400, 'Email Already Exists, Recover Your Account');
        return Response.send(res);
      }
      // } else {
      //   Response.setError(400, 'Email must end in @' + domain);
      //   return Response.send(res);
      // }
    }
  }

  static async confirmEmail(req, res) {
    const confirmationCode = req.params.confirmationCode;
    try {
      if (!confirmationCode) {
        //if token is missing
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Confirmation Token Missing!!!'
        );
      }
      // console.log('Confirmation Code: ' + confirmationCode);
      jwt.verify(
        confirmationCode,
        process.env.SECRET_KEY,
        async (err, payload) => {
          if (err) {
            //if token was tampered with or invalid
            // console.log(err);
            Response.setError(
              HttpStatusCode.STATUS_BAD_REQUEST,
              'Email Verification Failed, Email Could not be verified!!!'
            );
            return Response.send(res);
          }
          //fetch users records from the database
          const userExist = await db.User.findOne({
            where: {email: payload.email}
          });
          if (!userExist) {
            // if users email doesnt exist then
            // console.log(err);
            Response.setError(
              HttpStatusCode.STATUS_BAD_REQUEST,
              'Email verification failed, Account Not Found'
            );
            return Response.send(res);
          }
          // console.log(userExist);
          //update users status to verified
          db.User.update(
            {status: 'activated', is_email_verified: true},
            {where: {email: payload.email}}
          )
            .then(() => {
              Response.setSuccess(
                HttpStatusCode.STATUS_OK,
                'User With Email: ' + payload.email + ' Account Activated!',
                {
                  email: payload.email
                }
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
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async resendMail(req, res) {
    //get payload
    const data = req.body;
    try {
      const rules = {
        email: 'required|email',
        host_url: 'required|url'
      };
      //validate payload
      const validation = new Validator(data, rules, {
        host_url: 'Only valid url with https or http allowed'
      });
      if (validation.fails()) {
        Response.setError(400, validation.errors);
        return Response.send(res);
      } else {
        //get users email from db
        const userExist = await db.User.findOne({
          where: {
            email: data.email
          }
        });
        // if users email doesnt exist then
        if (!userExist) {
          console.log(err);
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Users Account Does Not Exist, Please Register The Account!'
          );
          return Response.send(res);
        } else {
          const orgDetails = await db.Organisation.findOne({
            where: {
              email: data.email
            }
          });
          if (!orgDetails) {
            console.log(err);
            Response.setError(
              HttpStatusCode.STATUS_BAD_REQUEST,
              'Users Account Does Not Exist, Please Register The Account!'
            );
            return Response.send(res);
          } else {
            //generate Token
            const token = jwt.sign(
              {email: data.email},
              process.env.SECRET_KEY,
              {
                expiresIn: '24hr'
              }
            );

            const verifyLink =
              data.host_url + '/email-verification/?confirmationCode=' + token;
            //else resend token to user
            MailerService.sendEmailVerification(
              data.email,
              orgDetails.name,
              verifyLink
            )
              .then(() => {
                Response.setSuccess(
                  HttpStatusCode.STATUS_OK,
                  'A new confirmation token sent to the provided email address ',
                  {email: data.email}
                );
                return Response.send(res);
              })
              .catch(err => {
                Response.setError(500, err);
                return Response.send(res);
              });
          }
        }
      }
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Please try again.'
      );
      return Response.send(res);
    }
  }

  // Refactored Methods

  static async signIn(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });

      const data = await AuthService.login(user, req.body.password.trim());
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      Logger.info(`Internal Server Error: ${error}`);
      const message =
        error.status == 401 ? error.message : 'Internal Server Error';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async signInNGO(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });

      // if (user && user.is_email_verified === false) {
      //   Response.setError(
      //     HttpStatusCode.STATUS_UNAUTHORIZED,
      //     'Access Denied, Email Account has not been Verified.'
      //   );
      //   return Response.send(res);
      // }

      if (user && user.RoleId != AclRoles.NgoAdmin) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }
      const orgId = user.AssociatedOrganisations[0].OrganisationId;
      const orgWallet = await WalletService.findMainOrganisationWallet(orgId);
      if (!orgWallet) {
        await QueueService.createWallet(orgId, 'organisation');
      }
      const wallet = await WalletService.findSingleWallet({
        UserId: user.id,
        CampaignId: null
      });
      if (!wallet) {
        await QueueService.createWallet(user.id, 'user');
      }
      if (user.is_tfa_enabled && user.tfa_method !== 'qrCode') {
        await AuthService.add2faSecret(user, user.tfa_method);
      }
      const data = await AuthService.login(user, req.body.password);
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      Logger.error(`Internal Server Error: ${error}`);
      const message =
        error.status == 401 ? error.message : 'Internal Server Error';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async signInField(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });

      if (user && user.RoleId !== AclRoles.FieldAgent) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }
      const wallet = await WalletService.findSingleWallet({
        UserId: user.id,
        CampaignId: null
      });
      if (!wallet) {
        await QueueService.createWallet(user.id, 'user');
      }
      const data = await AuthService.login(user, req.body.password);
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401 ? error.message : 'Internal Server Error';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async donorSignIn(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });
      if (user && user.RoleId !== AclRoles.Donor) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }

      const donorMainOrg = await OrganisationService.checkExistEmail(
        req.body.email
      );
      user.dataValues.mainOrganisation = donorMainOrg;
      const wallet = await WalletService.findSingleWallet({
        OrganisationId: user.id
      });
      if (!wallet) {
        await QueueService.createWallet(user.id, 'organisation');
      }
      const data = await AuthService.login(user, req.body.password.trim());

      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401 ? error.message : 'Internal Server Error';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  // static async signInField(req, res) {
  //   try {
  //     const user = await db.User.findOne({
  //       where: {
  //         email: req.body.email
  //       },
  //       include: {
  //         model: db.OrganisationMembers,
  //         as: 'AssociatedOrganisations',
  //         include: {
  //           model: db.Organisation,
  //           as: 'Organisation'
  //         }
  //       }
  //     });
  //     if (user && user.RoleId !== AclRoles.FieldAgent) {
  //       Response.setError(
  //         HttpStatusCode.STATUS_FORBIDDEN,
  //         'Access Denied, Unauthorised Access'
  //       );
  //       return Response.send(res);
  //     }
  //     const data = await AuthService.login(user, req.body.password);

  //     Response.setSuccess(200, 'Login Successful.', data);
  //     return Response.send(res);
  //   } catch (error) {
  //     const message =
  //       error.status == 401
  //         ? error.message
  //         : 'Internal Server Error';
  //     Response.setError(401, message);
  //     return Response.send(res);
  //   }
  // }
  static async signInBeneficiary(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });
      if (user && user.RoleId !== AclRoles.Beneficiary) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }

      const beneficiaryWallets = await WalletService.findUserWallets(user.id);

      for (let wallet of beneficiaryWallets) {
        const campaign = await CampaignService.getCampaignById(
          wallet.CampaignId
        );
        if (
          wallet.CampaignId &&
          campaign.type === 'campaign' &&
          !wallet.was_funded
        ) {
          const [campaign_token, beneficiary_token, campaignBeneficiary] =
            await Promise.all([
              BlockchainService.setUserKeypair(`campaign_${wallet.CampaignId}`),
              BlockchainService.setUserKeypair(
                `user_${user.id}campaign_${wallet.CampaignId}`
              ),
              BeneficiariesService.getApprovedBeneficiaries(wallet.CampaignId)
            ]);

          let amount = campaign.budget / campaignBeneficiary.length;
          await QueueService.approveOneBeneficiary(
            campaign_token.privateKey,
            beneficiary_token.address,
            amount,
            wallet.uuid,
            campaign,
            user
          );
        }
      }

      const data = await AuthService.login(user, req.body.password);
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401 ? error.message : 'Internal Server Error' + error;
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async signInVendor(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          vendor_id: req.body.vendor_id
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });
      if (user && user.RoleId !== AclRoles.Vendor) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }
      const data = await AuthService.login(
        user,
        req.body.password.trim(),
        AclRoles.Vendor
      );
      const wallet = await WalletService.findSingleWallet({
        UserId: user.id,
        CampaignId: null
      });
      if (!wallet) {
        await QueueService.createWallet(user.id, 'user');
      }
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401 ? error.message : 'Internal Server Error';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async signInAdmin(req, res) {
    try {
      const user = await db.User.findOne({
        where: {
          email: req.body.email
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });
      const data = await AuthService.login(
        user,
        req.body.password.trim(),
        AclRoles.SuperAdmin
      );
      Response.setSuccess(200, 'Login Successful.', data);
      return Response.send(res);
    } catch (error) {
      const message =
        error.status == 401 ? error.message : 'Internal Server Error';
      Response.setError(401, message);
      return Response.send(res);
    }
  }

  static async verify2FASecret(req, res) {
    try {
      await AuthService.verify2faSecret(req.user);
      Response.setSuccess(200, '2FA Data Verified', req.user);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }
  static async setTwoFactorSecret(req, res) {
    try {
      const rules = {
        tfa_method: 'required|in:qrCode,email,sms'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }

      const is_verified_all = req.user.is_verified_all;
      if (!is_verified_all) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Update your profile first'
        );
        return Response.send(res);
      }
      const data = await AuthService.add2faSecret(
        req.user,
        req.body.tfa_method
      );
      Response.setSuccess(200, '2FA Data Generated', data);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }
  // Enable 2FA
  static async enableTwoFactorAuth(req, res) {
    // TODO: Validate token
    try {
      const token = req.body.otp || req.query.otp;

      if (!token) {
        Response.setError(422, `OTP is required.`);
        return Response.send(res);
      }
      const rules = {
        tfa_method: 'required|in:qrCode,email,sms'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const user = await db.User.findOne({
        where: {
          id: req.user.id
        },
        include: {
          model: db.OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: {
            model: db.Organisation,
            as: 'Organisation'
          }
        }
      });

      const data = await AuthService.enable2afCheck(
        user,
        token,
        req.body.tfa_method
      );
      Response.setSuccess(200, 'Two factor authentication enabled.', data);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }

  static async disableTwoFactorAuth(req, res) {
    // TODO: Validate token
    try {
      const user = await AuthService.disable2afCheck(req.user);
      if (user)
        Response.setSuccess(200, 'Two factor authentication disabled.', user);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }

  static async toggleTwoFactorAuth(req, res) {
    // TODO: Validate token
    try {
      const user = await AuthService.toggle2afCheck(req.user);
      if (user)
        Response.setSuccess(200, 'Two factor authentication disabled.', user);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }
  static async state2fa(req, res) {
    // TODO: Validate token
    try {
      const user = await AuthService.state2fa(req.user);
      if (user) Response.setSuccess(200, 'Two State', user);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }
  static async requestPasswordReset(req, res) {
    try {
      const data = await AuthService.createResetPassword(req.user.id, req.ip);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Token generated.',
        data.toObject()
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed please try again.'
      );
      return Response.send(res);
    }
  }

  // static async resetPassword(req, res) {
  //   try {
  //     await AuthService.updatedPassord(req.user, req.body.password);
  //     Response.setSuccess(HttpStatusCode.STATUS_OK, 'Password changed.');
  //     return Response.send(res);
  //   } catch (error) {
  //     Response.setError(
  //       HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
  //       'Reset password request failed. Please try again.'
  //     );
  //     return Response.send(res);
  //   }
  // }

  static async sendInvite(req, res) {
    const {inviteeEmail, message, link} = req.body;
    const {organisation_id, campaign_id} = req.params;
    try {
      const rules = {
        'inviteeEmail*': 'email|required',
        link: 'required|string'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      let user_exist = false;
      const campaign = await CampaignService.getCampaignById(campaign_id);
      for (let email of inviteeEmail) {
        const [ngo, donor] = await Promise.all([
          OrganisationService.checkExist(organisation_id),

          OrganisationService.checkExistEmail(email)
        ]);
        const token = await AuthService.inviteDonor(
          email,
          organisation_id,
          campaign_id
        );

        if (!donor) {
          user_exist = false;
          await MailerService.sendInvite(
            email,
            token,
            campaign,
            ngo.name,
            false,
            message,
            link
          );
        } else {
          user_exist = true;
          await MailerService.sendInvite(
            email,
            token,
            campaign,
            ngo.name,
            true,
            message,
            link
          );
        }
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Invite sent to donor.',
        {campaignId: campaign.id, is_public: campaign.is_public, user_exist}
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async resetPassword(req, res) {
    try {
      await AuthService.updatedPassord(req.user, req.body.password);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Password changed.');
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Reset password request failed. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async confirmInvite(req, res) {
    const {token, campaignId} = req.params;
    try {
      const rules = {
        token: 'required|string',
        campaignId: 'integer|required'
      };
      const validation = new Validator(req.params, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const [campaign, token_exist] = await Promise.all([
        CampaignService.getCampaignById(campaignId),
        db.Invites.findOne({where: {token}})
      ]);
      const userExist = await UserService.findSingleUser({
        email: token_exist.email
      });
      let user_exist = false;
      if (userExist) {
        user_exist = true;
      }
      if (!campaign) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign ID Not Found'
        );
        return Response.send(res);
      }
      jwt.verify(token, process.env.SECRET_KEY, async (err, payload) => {
        if (err) {
          Response.setError(
            HttpStatusCode.STATUS_UNAUTHORIZED,
            'Unauthorised. Token Invalid'
          );
          return Response.send(res);
        }
        const ngo = await OrganisationService.checkExist(token_exist.inviterId);
        const donor = await OrganisationService.checkExistEmail(
          token_exist.email
        );

        const isAdded = await db.Invites.findOne({
          where: {CampaignId: campaignId, token, isAdded: false}
        });

        if (!ngo) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            "You don't have access to view this campaign"
          );
          return Response.send(res);
        }

        if (!isAdded) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            "You don't have access to view this campaign"
          );
          return Response.send(res);
        }
        if (donor) {
          const associate = await db.AssociatedCampaign.findOne({
            where: {
              DonorId: donor.id,
              CampaignId: campaignId
            }
          });

          if (associate) {
            Response.setSuccess(
              HttpStatusCode.STATUS_OK,
              'You already have access to this campaign'
            );
            return Response.send(res);
          }
          await db.AssociatedCampaign.create({
            DonorId: donor.id,
            CampaignId: campaignId
          });
        }

        await isAdded.update({isAdded: true});
        Response.setSuccess(
          HttpStatusCode.STATUS_CREATED,
          'campaign invitation has been confirmed',
          {
            campaignId,
            is_public: campaign.is_public,
            user_exist,
            email: token_exist.email
          }
        );
        return Response.send(res);
      });
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async createDonorAccount(req, res) {
    const data = req.body;
    try {
      const rules = {
        organisation_name: 'string',
        password: 'required',
        website_url: 'url',
        campaignId: 'integer|required',
        email: 'email|required'
      };
      const validation = new Validator(data, rules, {
        url: 'Only valid url with https or http allowed'
      });
      if (validation.fails()) {
        Response.setError(400, validation.errors);
        return Response.send(res);
      }
      const [campaign, exist] = await Promise.all([
        CampaignService.getCampaignById(data.campaignId),
        db.Invites.findOne({
          where: {email: data.email, isAdded: true, CampaignId: data.campaignId}
        })
      ]);

      const url_string = data.website_url;
      const email = data.email;
      if (url_string) {
        const domain = extractDomain(url_string);
        const re = '(\\W|^)[\\w.\\-]{0,25}@' + domain + '(\\W|$)';
        if (!email.match(new RegExp(re))) {
          Response.setError(400, 'Email must end in @' + domain);
          return Response.send(res);
        }
      }

      const userExist = await UserService.findSingleUser({
        email: email
      });

      if (!campaign) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign ID Not Found'
        );
        return Response.send(res);
      }

      if (userExist) {
        Response.setError(400, 'Email Already Exists, Recover Your Account');
        return Response.send(res);
      }
      // const isAdded = await db.Invites.findOne({
      //   where: {
      //     CampaignId: data.campaignId,
      //     email: data.email,
      //     isAdded: true
      //   }
      // });

      if (!exist) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          "You don't have access to view this campaign"
        );
        return Response.send(res);
      }
      const ass = await db.AssociatedCampaign.findOne({
        where: {
          DonorId: createdOrganisation.id,
          CampaignId: data.campaignId
        }
      });

      if (ass) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Already on campaign'
        );
        return Response.send(res);
      }
      // const organisationExist = await db.Organisation.findOne({
      //   where: {
      //     [Op.or]: [
      //       {
      //         name: data.organisation_name
      //       },
      //       {
      //         website_url: data.website_url
      //       }
      //     ]
      //   }
      // });
      // if (organisationExist) {
      //   Response.setError(
      //     400,
      //     'An Organisation with such name or website url already exist'
      //   );
      //   return Response.send(res);
      // }

      const password = createHash(req.body.password);
      const user = await UserService.addUser({
        RoleId: AclRoles.Donor,
        email: data.email,
        password
      });

      const createdOrganisation = await db.Organisation.create({
        name: data.organisation_name || 'no org',
        email: data.email,
        website_url: data.website_url || 'null',
        registration_id: generateOrganisationId()
      });

      await db.OrganisationMembers.create({
        UserId: user.id,
        role: 'donor',
        OrganisationId: exist.inviterId
      });
      await db.AssociatedCampaign.create({
        DonorId: createdOrganisation.id,
        CampaignId: data.campaignId
      });

      await QueueService.createWallet(createdOrganisation.id, 'organisation');

      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Donor and User registered successfully',
        createdOrganisation
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error, Contact Support'
      );
      return Response.send(res);
    }
  }
}

function extractDomain(url) {
  var domain;
  //find & remove protocol (http, ftp, etc.) and get domain
  if (url.indexOf('://') > -1) {
    domain = url.split('/')[2];
  } else {
    domain = url.split('/')[0];
  }

  //find & remove www
  if (domain.indexOf('www.') > -1) {
    domain = domain.split('www.')[1];
  }

  domain = domain.split(':')[0]; //find & remove port number
  domain = domain.split('?')[0]; //find & remove url params

  return domain;
}

module.exports = AuthController;
