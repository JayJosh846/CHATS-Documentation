const {
  BeneficiaryService,
  WalletService,
  CampaignService,
  QueueService,
  OrganisationService,
  BlockchainService,
  UserService,
  MailerService,
  SmsService
} = require('../services');
const util = require('../libs/Utils');
const db = require('../models');
const Validator = require('validatorjs');

const {Response} = require('../libs');

const moment = require('moment');
const {
  HttpStatusCode,
  compareHash,
  BeneficiarySource,
  AclRoles,
  generateRandom,
  createHash
} = require('../utils');
const {type} = require('../libs/Utils');
class BeneficiariesController {
  static async getAllUsers(req, res) {
    try {
      const allUsers = await BeneficiaryService.getAllUsers();
      if (allUsers.length > 0) {
        util.setSuccess(200, 'Users retrieved', allUsers);
      } else {
        util.setSuccess(200, 'No User found');
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }

  static async createUser(req, res, next) {
    try {
      const {
        first_name,
        last_name,
        email,
        phone,
        password,
        OrganisationId,
        bvn,
        gender,
        marital_status,
        location,
        address,
        right_fingers,
        left_fingers,
        profile_pic
      } = req.body;

      //check if email already exist
      db.User.findOne({
        where: {
          email: req.body.email,
          phone: req.body.phone
        }
      })
        .then(user => {
          if (user !== null) {
            util.setError(400, 'Email Already Exists, Recover Your Account');
            return util.send(res);
          }
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt).then(hash => {
              const encryptedPassword = hash;
              const balance = 0.0;
              return db.User.create({
                RoleId: 5,
                OrganisationId: OrganisationId,
                first_name: first_name,
                last_name: last_name,
                phone: phone,
                email: email,
                password: encryptedPassword,
                gender: gender,
                marital_status: marital_status,
                balance: balance,
                bvn: bvn,
                status: 1,
                location: location,
                address: address,
                referal_id: '',
                pin: '',
                last_login: new Date(),
                right_fingers: right_fingers,
                left_fingers: left_fingers,
                profile_pic: profile_pic
                // "balance","location","pin","blockchain_address","address","is_email_verified",
                // "is_phone_verified", "is_bvn_verified","is_self_signup","is_public","is_tfa_enabled",
                // "tfa_secret","is_organisation","organisation_id","last_login","createdAt","updatedAt"
              })
                .then(user => {
                  util.setSuccess(201, 'Account Successfully Created', user.id);
                  return util.send(res);
                })
                .catch(err => {
                  util.setError(500, err);
                  return util.send(res);
                });
            });
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

  static async updatedUser(req, res) {
    const alteredUser = req.body;
    const {id} = req.params;
    if (!Number(id)) {
      util.setError(400, 'Please input a valid numeric value');
      return util.send(res);
    }
    try {
      const updateUser = await BeneficiaryService.updateUser(id, alteredUser);
      if (!updateUser) {
        util.setError(404, `Cannot find User with the id: ${id}`);
      } else {
        util.setSuccess(200, 'User updated', updateUser);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }

  static async getAUser(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      util.setError(400, 'Please input a valid numeric value');
      return util.send(res);
    }

    try {
      const theUser = await BeneficiaryService.getAUser(id);
      if (!theUser) {
        util.setError(404, `Cannot find User with the id ${id}`);
      } else {
        util.setSuccess(200, 'Found User', theUser);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }

  static async deleteUser(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      util.setError(400, 'Please provide a numeric value');
      return util.send(res);
    }

    try {
      const UserToDelete = await BeneficiaryService.deleteUser(id);

      if (UserToDelete) {
        util.setSuccess(200, 'User deleted');
      } else {
        util.setError(404, `User with the id ${id} cannot be found`);
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }

  static async createComplaint(req, res) {
    const data = req.body;
    const rules = {
      beneficiaryId: 'required|numeric',
      report: 'required|string'
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const beneficiary_exist = await BeneficiaryService.checkBeneficiary(
        data.beneficiaryId
      );
      if (beneficiary_exist) {
        const newComplaint = {
          BeneficiaryId: data.beneficiaryId,
          report: data.report
        };
        const complaint = await BeneficiaryService.createComplaint(
          newComplaint
        );
        util.setSuccess(200, 'A new complaint has been made successfully');
        return util.send(res);
      } else {
        util.setError(422, 'Beneficiary Id is Invalid');
        return util.send(res);
      }
    }
  }

  static async resolveComplaint(req, res) {
    const data = req.body;
    const rules = {
      complaintId: 'required|numeric'
    };
    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const complaint_exist = await BeneficiaryService.checkComplaint(
        data.complaintId
      );
      if (complaint_exist) {
        await BeneficiaryService.updateComplaint(data.complaintId).then(() => {
          util.setSuccess(200, 'Complaint Resolved successfully.');
          return util.send(res);
        });
      } else {
        util.setError(422, 'Complaint Id is Invalid');
        return util.send(res);
      }
    }
  }

  static async getComplaintsByBeneficiary(req, res) {
    const beneficiary = req.params.beneficiary;
    var whereCondtion = {
      BeneficiaryId: beneficiary
    };
    if (req.query.status) {
      whereCondtion['status'] = req.query.status;
    }
    const page_val = req.query.page ? req.query.page : 1;
    const options = {
      page: page_val,
      paginate: 10,
      where: whereCondtion,
      order: [['id', 'DESC']]
    };
    const {docs, pages, total} = await db.Complaints.paginate(options);
    var nextPage = null;
    var prevPage = null;
    if (page_val != pages) {
      nextPage = Number(page_val) + 1;
    }

    if (page_val != 1) {
      prevPage = Number(page_val) - 1;
    }

    util.setSuccess(200, 'Complaints Retrieved', {
      complaints: docs,
      current_page: options.page,
      pages: pages,
      total: total,
      nextPage: nextPage,
      prevPage: prevPage
    });
    return util.send(res);
  }

  static async getBeneficiaryUserWallet(req, res) {
    const beneficiary = req.params.beneficiary;
    const beneficiary_exist = await db.User.findOne({
      where: {
        id: beneficiary
      },
      include: {
        as: 'Wallet',
        model: db.Wallet,
        attributes: {
          exclude: ['privateKey', 'bantuAddress', 'bantuPrivateKey']
        }
      }
    });
    const campaigns = await db.Beneficiaries.findAll({
      where: {
        UserId: beneficiary
      },
      include: ['Campaign']
    });
    if (beneficiary_exist) {
      util.setSuccess(200, 'User Object.', {
        user: beneficiary_exist,
        associatedCampaigns: campaigns
      });
      return util.send(res);
    } else {
      util.setError(422, 'Beneficiary Id is Invalid');
      return util.send(res);
    }
  }

  static async getBeneficiaryUser(req, res) {
    const beneficiary = req.params.beneficiary;
    const beneficiary_exist = await db.User.findByPk(beneficiary);
    const campaigns = await db.Beneficiary.findAll({
      where: {
        UserId: beneficiary
      },
      include: ['Campaign']
    });
    if (beneficiary_exist) {
      util.setSuccess(200, 'User Object.', {
        user: beneficiary_exist,
        associatedCampaigns: campaigns
      });
      return util.send(res);
    } else {
      util.setError(422, 'Beneficiary Id is Invalid');
      return util.send(res);
    }
  }

  static async getComplaintsByCampaign(req, res) {
    let campaign = req.params.campaign;
    let status = req.query.status;
    let campaignExist = await db.Campaign.findByPk(campaign);
    if (!campaignExist) {
      util.setError(422, 'Campaign Invalid');
      return util.send(res);
    }
    let whereQuery = {
      CampaignId: campaign
    };
    let allowedStatus = ['resolved', 'unresolved'];
    if (allowedStatus.includes(status)) {
      whereQuery['status'] = status;
    }
    const complaints = await db.Complaints.findAll({
      where: whereQuery
    });
    util.setSuccess(200, 'Complaints Retrieved', complaints);
    return util.send(res);
  }

  // Refactored
  static async joinCampaign(req, res) {
    try {
      const campaign = req.campaign;
      const beneficiaryId = req.beneficiary_id;

      if (campaign.status !== 'active') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign is not active.'
        );
        return Response.send(res);
      }

      const beneficiary = await CampaignService.addBeneficiary(
        campaign.id,
        beneficiaryId,
        BeneficiarySource.beneficiary
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Beneficiary Added.',
        beneficiary
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async joinCampaignField(req, res) {
    try {
      const campaign = req.campaign;
      const beneficiaryId = req.params.beneficiary_id;

      if (campaign.status !== 'active') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign is not active.'
        );
        return Response.send(res);
      }

      const beneficiary = await CampaignService.addBeneficiary(
        campaign.id,
        beneficiaryId,
        BeneficiarySource.beneficiary
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Beneficiary Added.',
        beneficiary
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.'
      );
      return Response.send(res);
    }
  }

  // Refactored

  static async leaveCampaign(req, res) {
    try {
      const campaign = req.campaign;
      const beneficiaryId = req.beneficiary_id;
      if (campaign.status == 'completed') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign is already completed.'
        );
        return Response.send(res);
      }
      if (campaign.status == 'ended') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign is already ended.'
        );
        return Response.send(res);
      }
      await CampaignService.removeBeneficiary(campaign.id, beneficiaryId);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Beneficiary removed successfully'
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async addAccount(req, res) {
    const data = req.body;
    const rules = {
      account_number: 'required|numeric',
      bank_name: 'required|string'
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      await db.User.findByPk(req.user.id)
        .then(async user => {
          const account_exist = await db.Accounts.findOne({
            where: {
              UserId: req.user.id,
              account_number: data.account_number
            }
          });
          if (account_exist) {
            util.setError(400, 'Account Number already added');
            return util.send(res);
          } else {
            await user
              .createAccount({
                account_number: data.account_number,
                bank_name: data.bank_name
              })
              .then(response => {
                util.setSuccess(201, 'Account Added Successfully');
                return util.send(res);
              });
          }
        })
        .catch(error => {
          util.setError(404, 'Invalid User');
          return util.send(res);
        });
    }
  }
  static async getWallets(req, res) {
    try {
      let total = 0;
      const Wallets = await WalletService.findUserWallets(req.user.id);
      const total_balance = Wallets.map(wallet => wallet.balance).reduce(
        (a, b) => a + b,
        0
      );

      // const total_balance = Wallets.map(wallet => {
      //   total += wallet.balance;
      //   const w = wallet.toObject();
      // const campaign_token = await BlockchainService.setUserKeypair(
      //   `user_${req.user.id}campaign_${wallet.CampaignId}`
      // );
      // const token = await BlockchainService.balance(campaign_token.address);
      // total += Number(token.Balance.split(',').join(''));

      //   return w;
      // });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary wallets', {
        total_balance,
        Wallets
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.'
      );
      return Response.send(res);
    }
  }

  // Register By Organisation Special Case
  static async registerSpecialCaseBeneficiary(req, res) {}

  static async registerBeneficiary(req, res) {}

  static async getProfile(req, res) {
    try {
      let total_wallet_spent = 0;
      let total_cash_balance = 0;
      let total_wallet_received = 0;
      let personal_wallet_balance = 0;

      const _beneficiary = await BeneficiaryService.beneficiaryProfile(
        req.user.id
      );

      // const Wallets = _beneficiary.Wallets.map(wallet => {
      //   total_wallet_balance += wallet.balance;
      //   // total_wallet_spent += wallet.SentTransactions.map(tx => tx.amount).reduce((a, b) => a + b, 0);
      //   // total_wallet_received += wallet.ReceivedTransactions.map(tx => tx.amount).reduce((a, b) => a + b, 0);
      //   const w = wallet.toObject();
      //   // delete w.ReceivedTransactions;
      //   // delete w.SentTransactions;
      //   return w;
      // });

      for (let wallet of _beneficiary.Wallets) {
        if (!wallet.CampaignId) {
          const address = await BlockchainService.setUserKeypair(
            `user_${req.user.id}`
          );
          const token = await BlockchainService.balance(address.address);
          const balance = Number(token.Balance.split(',').join(''));
          personal_wallet_balance += balance;
        }
        if (wallet.CampaignId) {
          const campaignAddress = await BlockchainService.setUserKeypair(
            `campaign_${wallet.CampaignId}`
          );

          const beneficiaryAddress = await BlockchainService.setUserKeypair(
            `user_${req.user.id}campaign_${wallet.CampaignId}`
          );
          const token = await BlockchainService.allowance(
            campaignAddress.address,
            beneficiaryAddress.address
          );
          const balance = Number(token.Allowed.split(',').join(''));
          total_cash_balance += balance;
        }
      }

      const beneficiary = _beneficiary.toObject();

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiary Profile.', {
        total_cash_balance,
        personal_wallet_balance,
        ...beneficiary
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.' + error
      );
      return Response.send(res);
    }
  }
  static async beneficaryTransactions(req, res) {
    try {
      const beneficiary = req.beneficiary.toJSON();
      const Transactions = await BeneficiaryService.beneficiaryTransactions(
        beneficiary.id
      );
      const transactions_count = Transactions.length;
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Beneficiary Transactions.',
        {
          ...beneficiary,
          transactions_count,
          Transactions
        }
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.'
      );
      return Response.send(res);
    }
  }

  static async beneficiariesByGender(req, res) {
    try {
      let male = 0;
      let female = 0;
      const org = await OrganisationService.isMemberUser(req.user.id);
      const beneficiaries = await BeneficiaryService.getBeneficiaries(
        org.OrganisationId
      );

      if (beneficiaries.length > 0) {
        for (let i = 0; i < beneficiaries.length; i++) {
          if (beneficiaries[i].gender == 'male') {
            male++;
          } else if (beneficiaries[i].gender == 'female') {
            female++;
          }
        }

        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Beneficiary By Gender Retrieved.',
          {
            male,
            female
          }
        );
        return Response.send(res);
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'No Beneficiary By Gender Retrieved.',
        {male, female}
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.'
      );
      return Response.send(res);
    }
  }

  static async beneficiariesByAgeGroup(req, res) {
    try {
      let eighteenTo29 = 0;
      let thirtyTo41 = 0;
      let forty2To53 = 0;
      let fifty4To65 = 0;
      let sixty6Up = 0;

      const org = await OrganisationService.isMemberUser(req.user.id);

      const beneficiaries = await BeneficiaryService.getBeneficiaries(
        org.OrganisationId
      );

      if (beneficiaries.length > 0) {
        for (let i = 0; i < beneficiaries.length; i++) {
          if (
            parseInt(
              moment().format('YYYY') -
                moment(beneficiaries[i].dob).format('YYYY')
            ) >= 18 &&
            parseInt(
              moment().format('YYYY') -
                moment(beneficiaries[i].dob).format('YYYY')
            ) <= 29
          ) {
            eighteenTo29++;
          }
          if (
            parseInt(
              moment().format('YYYY') -
                moment(beneficiaries[i].dob).format('YYYY')
            ) >= 30 &&
            parseInt(
              moment().format('YYYY') -
                moment(beneficiaries[i].dob).format('YYYY')
            ) <= 41
          ) {
            thirtyTo41++;
          }
          if (
            parseInt(
              moment().format('YYYY') -
                moment(beneficiaries[i].dob).format('YYYY')
            ) >= 42 &&
            parseInt(
              moment().format('YYYY') -
                moment(beneficiaries[i].dob).format('YYYY')
            ) <= 53
          ) {
            forty2To53++;
          }
          if (
            parseInt(
              moment().format('YYYY') -
                moment(beneficiaries[i].dob).format('YYYY')
            ) >= 54 &&
            parseInt(
              moment().format('YYYY') -
                moment(beneficiaries[i].dob).format('YYYY')
            ) <= 65
          ) {
            fifty4To65++;
          }
          if (
            parseInt(
              moment().format('YYYY') -
                moment(beneficiaries[i].dob).format('YYYY')
            ) >= 66
          ) {
            sixty6Up++;
          }
        }

        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Beneficiary By Age Group Retrieved.',
          {
            eighteenTo29,
            thirtyTo41,
            forty2To53,
            fifty4To65,
            sixty6Up
          }
        );
        return Response.send(res);
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'No Beneficiary By Age Group Retrieved.',
        {eighteenTo29, thirtyTo41, forty2To53, fifty4To65, sixty6Up}
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.'
      );
      return Response.send(res);
    }
  }
  static async beneficiariesByMaritalStatus(req, res) {
    try {
      let married = 0;
      let single = 0;
      let divorce = 0;
      const org = await OrganisationService.isMemberUser(req.user.id);
      const beneficiaries = await BeneficiaryService.getBeneficiaries(
        org.OrganisationId
      );

      if (beneficiaries.length > 0) {
        for (let i = 0; i < beneficiaries.length; i++) {
          if (beneficiaries[i].marital_status == 'single') {
            single++;
          } else if (beneficiaries[i].marital_status == 'married') {
            married++;
          } else if (beneficiaries[i].marital_status == 'divorce') {
            divorce++;
          }
        }

        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Beneficiary By Marital Status Retrieved.',
          {
            single,
            married,
            divorce
          }
        );
        return Response.send(res);
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'No Beneficiary By Marital Status Retrieved.',
        {single, married, divorce}
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.'
      );
      return Response.send(res);
    }
  }

  static async beneficiariesByLocation(req, res) {
    try {
      let Lagos = 0,
        Abuja = 0,
        Kaduna = 0,
        Jos = 0;
      const org = await OrganisationService.isMemberUser(req.user.id);

      const beneficiaries = await BeneficiaryService.getBeneficiaries(
        org.OrganisationId
      );

      if (beneficiaries.length > 0) {
        beneficiaries.forEach(beneficiary => {
          if (beneficiary.location.includes('state')) {
            let parsedJson = JSON.parse(beneficiary.location);
            if (parsedJson.state === 'Abuja') Abuja++;
            if (parsedJson.state === 'Lagos') Lagos++;
            if (parsedJson.state === 'Kaduna') Kaduna++;
            if (parsedJson.state === 'Jos') Jos++;
          }
        });

        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Beneficiary By Location Retrieved...',
          {Abuja, Lagos, Kaduna, Jos}
        );
        return Response.send(res);
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'No Beneficiary By Location Retrieved.',
        {Abuja, Lagos, Kaduna, Jos}
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

  static async beneficiariesTotalBalance(req, res) {
    try {
      let beneficiary;
      let balance;
      let zeroTo100k = 0;
      let hundredKTo200K = 0;
      let twoHundredKTo300K = 0;
      let threeHundredKTo400K = 0;
      let fourHundredKTo500K = 0;
      let fiveHundredKTo600K = 0;
      let sixHundredKTo700K = 0;
      let sevenHundredKTo800K = 0;
      let eightHundredKTo900K = 0;
      let nineHundredKToOneMill = 0;
      let total_wallet_balance = 0;
      const org = await OrganisationService.isMemberUser(req.user.id);
      const beneficiaries =
        await BeneficiaryService.getBeneficiariesTotalAmount(
          org.OrganisationId
        );

      const walletBalance = [];
      beneficiaries.forEach(beneficiary => {
        beneficiary.Wallets.forEach(wallet => {
          total_wallet_balance += wallet.balance;
          return total_wallet_balance;
        });
        walletBalance.push(total_wallet_balance);
        total_wallet_balance = 0;
      });
      walletBalance.forEach(balance => {
        if (parseInt(balance) >= 0 && parseInt(balance) <= 100000) {
          zeroTo100k++;
        }
        if (parseInt(balance) >= 100001 && parseInt(balance) <= 200000) {
          hundredKTo200K++;
        }
        if (parseInt(balance) >= 200001 && parseInt(balance) <= 300000) {
          twoHundredKTo300K++;
        }
        if (parseInt(balance) >= 300001 && parseInt(balance) <= 400000) {
          threeHundredKTo400K++;
        }
        if (parseInt(balance) >= 400001 && parseInt(balance) <= 500000) {
          fourHundredKTo500K++;
        }
        if (parseInt(balance) >= 500001 && parseInt(balance) <= 600000) {
          fiveHundredKTo600K++;
        }
        if (parseInt(balance) >= 600001 && parseInt(balance) <= 700000) {
          sixHundredKTo700K++;
        }
        if (parseInt(balance) >= 700001 && parseInt(balance) <= 800000) {
          sevenHundredKTo800K++;
        }
        if (parseInt(balance) >= 800001 && parseInt(balance) <= 900000) {
          eightHundredKTo900K++;
        }
        if (parseInt(balance) >= 900001 && parseInt(balance) <= 1000000) {
          nineHundredKToOneMill++;
        }
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Beneficiary Total Balance Retrieved.',
        {
          zeroTo100k,
          hundredKTo200K,
          twoHundredKTo300K,
          threeHundredKTo400K,
          fourHundredKTo500K,
          fiveHundredKTo600K,
          sixHundredKTo700K,
          sevenHundredKTo800K,
          eightHundredKTo900K,
          nineHundredKToOneMill
        }
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.'
      );
      return Response.send(res);
    }
  }

  static async beneficiaryChart(req, res) {
    const {period} = req.params;
    try {
      const transactions = await BeneficiaryService.beneficiaryChart(
        req.user.id,
        period
      );
      if (transactions.length <= 0) {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'No Transaction Found.',
          transactions
        );
        return Response.send(res);
      }

      for (let transaction of transactions.rows) {
        if (transaction.narration === 'Approve Beneficiary Funding') {
          const ngo = await OrganisationService.checkExist(
            transaction.OrganisationId
          );
          transaction.dataValues.narration = `Payment from (${
            ngo.name || ngo.email
          })`;

          transaction.dataValues.transaction_type = 'credit';
        }
        if (transaction.narration === 'Vendor Order') {
          const vendor = await UserService.getAUser(transaction.VendorId);
          transaction.dataValues.narration = `Payment to (${
            vendor.first_name + ' ' + vendor.last_name
          })`;
          transaction.dataValues.transaction_type = 'debit';
        }
        if (
          transaction.transaction_type === 'transfer' &&
          transaction.SenderWallet.UserId === req.user.id
        ) {
          const beneficiary = await UserService.getAUser(
            transaction.ReceiverWallet.UserId
          );
          transaction.dataValues.narration = `Payment to (${
            beneficiary.first_name + ' ' + beneficiary.last_name
          })`;
          transaction.dataValues.transaction_type = 'debit';
        }
        if (
          transaction.transaction_type === 'transfer' &&
          transaction.SenderWallet.UserId !== req.user.id
        ) {
          const beneficiary = await UserService.getAUser(
            transaction.SenderWallet.UserId
          );
          transaction.dataValues.narration = `Payment from (${
            beneficiary.first_name + ' ' + beneficiary.last_name
          })`;
          transaction.dataValues.transaction_type = 'credit';
        }
        if (transaction.dataValues.ReceiverWallet === null)
          delete transaction.dataValues.ReceiverWallet;
        if (transaction.dataValues.SenderWallet === null)
          delete transaction.dataValues.SenderWallet;
      }

      transactions.rows.forEach(transaction => {
        if (typeof transaction.dataValues.ReceiverWallet !== 'undefined') {
          transaction.dataValues.BlockchainXp_Link = `https://testnet.bscscan.com/token/0xa31d8a40a2127babad4935163ff7ce0bbd42a377?a=
         ${transaction.ReceiverWallet.address}`;
        }
        if (typeof transaction.dataValues.SenderWallet !== 'undefined') {
          transaction.dataValues.BlockchainXp_Link = `https://testnet.bscscan.com/token/0xa31d8a40a2127babad4935163ff7ce0bbd42a377?a=
         ${transaction.SenderWallet.address}`;
        }
      });
      const periods = transactions.rows.map(period =>
        moment(period.createdAt).format('ddd')
      );

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Transaction Recieved.', {
        periods,
        transactions
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.',
        error
      );
      return Response.send(res);
    }
  }

  static async BeneficiaryPayForProduct(req, res) {
    const {vendorId, productId, campaignId} = req.params;
    const uuid = req.body.uuid;
    const rules = {
      uuid: 'required|string'
    };

    const validation = new Validator(req.body, rules);
    try {
      if (!Number(vendorId)) {
        util.setError(400, 'Please input a valid vendor ID');
        return util.send(res);
      } else if (!Number(productId)) {
        util.setError(400, 'Please input a valid product ID');
        return util.send(res);
      } else if (validation.fails()) {
        util.setError(422, validation.errors);
        return util.send(res);
      }
      //c4dc0ac9-ae1c-44e6-a727-49502fe8657d
      //25c7ac70-1c3b-463b-9a66-ed3f72c2b092
      //b82417e6-4524-448a-98fe-a62e5ec893a0
      //8217e5e4-4846-4c3b-926b-4e32bd3dd1be
      const beneficiary = await db.User.findOne({
        where: {id: req.user.id},
        attributes: ['id', 'first_name', 'last_name'],
        include: [{model: db.Wallet, as: 'Wallets', where: {uuid}}]
      });
      const campaignWallet = await db.Wallet.findOne({
        where: {CampaignId: campaignId}
      });
      const vendor = await BeneficiaryService.payForProduct(
        vendorId,
        productId
      );
      if (!beneficiary) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Beneficiary Not Found'
        );
        return Response.send(res);
      } else if (!vendor) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Vendor or Product Not Found'
        );
        return Response.send(res);
      }
      const VendorWallet = vendor.Wallets[0];
      const BenWallet = beneficiary.Wallets[0];

      const benBalance = BenWallet.balance;
      const product = vendor.Store.Products[0];
      if (benBalance < product.cost) {
        Response.setSuccess(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient beneficiary wallet balance',
          BenWallet
        );
        return Response.send(res);
      }
      QueueService.payForProduct(
        vendor,
        beneficiary,
        campaignWallet,
        VendorWallet,
        BenWallet,
        product
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Transaction Success',
        {
          vendor,
          beneficiary,
          campaignWallet
        }
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
  static async getCampaignQuestion(req, res) {
    const id = req.params.campaign_id;
    try {
      const question = await CampaignService.findCampaignFormByCampaignId(id);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Survey questions',
        question
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.'
      );
      return Response.send(res);
    }
  }
  static async submitQuestion(req, res) {
    const id = req.params.campaign_id;
    const data = req.body;

    try {
      const rules = {
        formId: 'required|numeric',
        'questions.*.type': 'required|in:multiple,optional,short',
        'questions.*.question': 'required|string',
        'questions.*.answer': 'required|string',
        'questions.*.reward': 'required|numeric'
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const question = await CampaignService.findCampaignFormByCampaignId(id);
      if (!question && question.campaign_form) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign not found'
        );
      }
      req.body.beneficiaryId = req.user.id;
      req.body.campaignId = id;
      const createdForm = await CampaignService.formAnswer(req.body);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Questionnaire submitted',
        createdForm
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.'
      );
      return Response.send(res);
    }
  }

  static async submitQuestionFieldAgent(req, res) {
    const id = req.params.campaign_id;
    const data = req.body;

    try {
      const rules = {
        formId: 'required|numeric',
        beneficiaryId: 'required|numeric',
        'questions.*.type': 'required|in:multiple,optional,short',
        'questions.*.question': 'required|string',
        'questions.*.answer': 'required|array',
        'questions.*.reward': 'required|array'
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const beneficiary = await BeneficiaryService.fetchCampaignBeneficiary(
        id,
        data.beneficiaryId
      );
      if (!beneficiary) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          "Beneficiary dos'nt belong to campaign"
        );
        return Response.send(res);
      }
      const formAnswer = await CampaignService.findCampaignFormAnswer({
        campaignId: id,
        beneficiaryId: data.beneficiaryId
      });
      if (formAnswer) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Survey already submitted for this form'
        );
        return Response.send(res);
      }
      const question = await CampaignService.findCampaignFormByCampaignId(id);

      if (question && !question.campaign_form) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          "Campaign dos'nt have a form"
        );
        return Response.send(res);
      }

      req.body.campaignId = id;
      const createdForm = await CampaignService.formAnswer(req.body);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Questionnaire submitted',
        createdForm
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

  static async adminRegisterBeneficiary(req, res) {
    const data = req.body;

    const {first_name, last_name, email, phone} = req.body;
    try {
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        email: 'required|email',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/']
      };
      const validation = new Validator(data, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const rawPassword = generateRandom(8);
      const password = createHash(rawPassword);
      data.RoleId = AclRoles.Beneficiary;
      const beneficiary = await UserService.findByEmail(data.email);
      if (beneficiary) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Email already taken'
        );
        return Response.send(res);
      }
      req.body.password = password;
      const createdBeneficiary = await UserService.addUser(data);
      await MailerService.verify(
        email,
        first_name + ' ' + last_name,
        rawPassword
      );
      createdBeneficiary.dataValues.password = null;
      await SmsService.sendOtp(
        phone,
        `Hi, ${first_name}  ${last_name} your CHATS account password is: ${rawPassword}`
      );
      await QueueService.createWallet(createdBeneficiary.id, 'user');
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Beneficiary registered successfully',
        createdBeneficiary
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

  static async transfer(req, res) {
    const data = req.body;
    try {
      const rules = {
        from_wallet: 'required|string|in:personal,campaign',
        username: 'required|string',
        pin: 'size:4|required',
        campaignId: 'string',
        amount: 'required|numeric'
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }

      const user = await UserService.findByUsername(data.username);

      if (!user) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Receiver account not found'
        );
        return Response.send(res);
      }
      if (!req.user.pin) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'PIN not found. Set PIN first.'
        );
        return Response.send(res);
      }

      if (!compareHash(data.pin, req.user.pin)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid or wrong old PIN.'
        );
        return Response.send(res);
      }

      const to_personal_wallet = await WalletService.findSingleWallet({
        UserId: user.id,
        CampaignId: null
      });
      if (!to_personal_wallet) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          "Receiver don't a personal wallet."
        );
        return Response.send(res);
      }
      if (data.from_wallet === 'personal') {
        const from_personal_wallet = await WalletService.findSingleWallet({
          UserId: req.user.id,
          CampaignId: null
        });

        if (!from_personal_wallet) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Sender personal wallet not valid'
          );
          return Response.send(res);
        }
        const {address} = await BlockchainService.setUserKeypair(
          `user_${from_personal_wallet.UserId}`
        );
        const token = await BlockchainService.balance(address);
        const balance = Number(token.Balance.split(',').join(''));
        if (balance < data.amount) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Insufficient Wallet Ballance'
          );
          return Response.send(res);
        }
        await QueueService.BeneficiaryTransfer(
          from_personal_wallet,
          to_personal_wallet,
          data.amount
        );
        Response.setSuccess(
          HttpStatusCode.STATUS_CREATED,
          'Transaction Processing'
        );
        return Response.send(res);
      }
      //Personal to campaign
      if (data.from_wallet === 'campaign') {
        const from_campaign_wallet = await WalletService.findSingleWallet({
          UserId: req.user.id,
          CampaignId: data.campaignId
        });

        if (!from_campaign_wallet) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Beneficiary campaign wallet not valid'
          );
          return Response.send(res);
        }

        const campaign_wallet = await WalletService.findSingleWallet({
          UserId: null,
          CampaignId: data.campaignId
        });

        if (!campaign_wallet) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Beneficiary campaign wallet not valid'
          );
          return Response.send(res);
        }

        const token = await BlockchainService.allowance(
          campaign_wallet.address,
          from_campaign_wallet.address
        );

        const balance = Number(token.Allowed.split(',').join(''));

        if (balance < data.amount) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Insufficient Wallet Ballance'
          );
          return Response.send(res);
        }

        await QueueService.BeneficiaryTransfer(
          from_campaign_wallet,
          to_personal_wallet,
          data.amount,
          campaign_wallet
        );
        Response.setSuccess(
          HttpStatusCode.STATUS_CREATED,
          'Transaction Processing'
        );
        return Response.send(res);
      }
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.' + error
      );
      return Response.send(res);
    }
  }
}

module.exports = BeneficiariesController;
