require('dotenv').config();
const db = require('../models');
const {util, Response, Logger} = require('../libs');
const {HttpStatusCode} = require('../utils');
const Validator = require('validatorjs');
const uploadFile = require('./AmazonController');
const {
  UserService,
  OrganisationService,
  VendorService,
  BeneficiaryService,
  CampaignService,
  TransactionService,
  BlockchainService,
  MailerServices
} = require('../services');
const {SanitizeObject} = require('../utils');
const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';
const axios = require('axios');
const {termiiConfig} = require('../config');
const {async} = require('regenerator-runtime');
const MailerService = require('../services/MailerService');
const SmsService = require('../services/SmsService');
const {AclRoles} = require('../utils');

class AdminController {
  static async updateStatus(req, res) {
    const data = req.body;

    try {
      const rules = {
        userId: 'required|numeric',
        status: 'required|string|in:activated,suspended'
      };

      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const bodyAllowedList = new Set(['userId', 'status']);
      for (let prop in req.body) {
        if (req.body.hasOwnProperty(prop) && !bodyAllowedList.has(prop)) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'unexpected parameter in POST body'
          );
          return Response.send(res);
        }
      }

      const userExist = await db.User.findOne({where: {id: data.userId}});

      if (!userExist) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          `Invalid user ID`
        );
        return Response.send(res);
      }
      const updatesUser = await userExist.update({status: data.status});

      const to = userExist.email;
      // const OrgName = userExist.;
      const OrgName = '';
      if (updatesUser && data.status === 'activated') {
        //send email notification to user
        await MailerService.ngoApprovedMail(to, OrgName);
      }
      updatesUser.dataValues.password = null;
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, `User status updated`);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`
      );
      return Response.send(res);
    }
  }

  static async updateCampaignStatus(req, res) {
    const data = req.body;
    const rules = {
      campaignId: 'required|numeric',
      status: 'required|string|in:in-progress,paused,pending'
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const campaignExist = await db.Campaign.findOne({
        where: {id: data.campaignId}
      });
      if (campaignExist) {
        await campaignExist.update({status: data.status}).then(response => {
          util.setError(200, 'Campaign Status Updated');
          return util.send(res);
        });
      } else {
        util.setError(404, 'Invalid Campaign Id', error);
        return util.send(res);
      }
    }
  }

  static async verifyAccount(req, res) {
    try {
      const {userprofile_id} = req.params;
      const data = req.body;
      data.country = 'Nigeria';
      data.currency = 'NGN';
      const rules = {
        first_name: 'required|string',
        last_name: 'required|string',
        nin_image_url: 'required|url',
        gender: 'required|in:male,female',
        address: 'string',
        location: 'string',
        dob: 'string',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        nin: 'required|digits_between:10,11',
        marital_status: 'string'
      };

      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      if (!req.file) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, `Upload Selfie`);
        return Response.send(res);
      }
      const organisation = await OrganisationService.findOneById(
        userprofile_id
      );
      if (!organisation) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Organisation Not Found`
        );
        return Response.send(res);
      }

      await db.User.update(
        {
          profile_pic: data.nin_image_url,
          ...data,
          status: 'activated',
          is_nin_verified: true
        },
        {where: {id: organisation.id}}
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `NIN Verified`,
        organisation
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal Server Error Try Again: ${error}`
      );
      return Response.send(res);
    }
  }

  static async getAllNGO(req, res) {
    try {
      const allNGOs = await OrganisationService.getAllOrganisations();

      for (let ngo of allNGOs) {
        const sum = ngo.Transactions.reduce((accumulator, object) => {
          return accumulator + object.amount;
        }, 0);
        let count = 0;
        const user = await UserService.findUser(ngo.Members[0].UserId);
        ngo.dataValues.status = user.status;
        ngo.dataValues.UserId = user.id;
        for (let campaign of ngo.Campaigns) {
          let beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
            campaign.id
          );
          count = count + beneficiaries.length;
        }
        ngo.dataValues.beneficiary_count = count;
        ngo.dataValues.disbursedSum = sum;
        delete ngo.dataValues.Transactions;
        delete ngo.dataValues.Campaigns;
        delete ngo.dataValues.Members;
      }

      if (allNGOs.length > 0) {
        Response.setSuccess(200, 'NGOs retrieved', allNGOs);
      } else {
        Response.setSuccess(200, 'No NGO found');
      }
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error.'
      );
      return Response.send(res);
    }
  }
  static async updateUserStatus(req, res) {
    try {
      const allNGOs = await OrganisationService.getAllOrganisations();

      for (let ngo of allNGOs) {
        const sum = ngo.Transactions.reduce((accumulator, object) => {
          return accumulator + object.amount;
        }, 0);
        let count = 0;
        const user = await UserService.findUser(ngo.Members[0].UserId);
        ngo.dataValues.status = user.status;
        ngo.dataValues.UserId = user.id;
        for (let campaign of ngo.Campaigns) {
          let beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
            campaign.id
          );
          count = count + beneficiaries.length;
        }
        ngo.dataValues.beneficiary_count = count;
        ngo.dataValues.disbursedSum = sum;
        delete ngo.dataValues.Transactions;
        delete ngo.dataValues.Campaigns;
        delete ngo.dataValues.Members;
      }

      if (allNGOs.length > 0) {
        Response.setSuccess(200, 'NGOs retrieved', allNGOs);
      } else {
        Response.setSuccess(200, 'No NGO found');
      }
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error.'
      );
      return Response.send(res);
    }
  }

  static async getNGODisbursedAndBeneficiaryTotal(req, res) {
    const {organisation_id} = req.params;

    try {
      let total = await TransactionService.getTotalTransactionAmountAdmin(
        organisation_id
      );
      const beneficiaries = await BeneficiaryService.findOrgnaisationBeneficiaries(
        organisation_id
      );
      const beneficiariesCount = Object.keys(beneficiaries).length;

      let spend_for_campaign = total.map(a => a.dataValues.amount);
      let disbursedSum = 0;
      for (let i = 0; i < spend_for_campaign.length; i++) {
        disbursedSum += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(200, 'Disbursed and Beneficiaries total retrieved', {
        disbursedSum,
        beneficiariesCount
      });

      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getAllVendors(req, res) {
    try {
      const allVendors = await VendorService.getAllVendorsAdmin();

      for (let vendor of allVendors) {
        const sum = vendor.StoreTransactions.reduce((accumulator, object) => {
          return accumulator + object.amount;
        }, 0);
        const campaign = await CampaignService.getVendorCampaigns(vendor.id);
        vendor.dataValues.total_amount_sold = sum;
        vendor.dataValues.total_campaign = campaign.length || null;
        vendor.dataValues.total_ngos = vendor.Organisations.length;
        delete vendor.dataValues.Organisations;
        delete vendor.dataValues.StoreTransactions;
      }
      Response.setSuccess(200, 'Vendors retrieved', allVendors);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error' + error
      );
      return Response.send(res);
    }
  }

  static async getVendorCampaignAndAmountTotal(req, res) {
    const {vendor_id} = req.params;
    try {
      const transactions = await VendorService.vendorsTransactionsAdmin(
        vendor_id
      );
      const campaigns = await CampaignService.getVendorCampaignsAdmin(
        vendor_id
      );
      const campaignsCount = Object.keys(campaigns).length;

      let spend_for_campaign = transactions.map(a => a.dataValues.amount);
      let amount_sold = 0;
      for (let i = 0; i < spend_for_campaign.length; i++) {
        amount_sold += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(200, 'Campaign and amount sold total retrieved', {
        amount_sold,
        campaignsCount
      });

      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getAllBeneficiaries(req, res) {
    try {
      const allBeneficiaries = await BeneficiaryService.getBeneficiariesAdmin();

      for (let beneficiary of allBeneficiaries) {
        const sum = beneficiary.OrderTransaction.reduce(
          (accumulator, object) => {
            return accumulator + object.amount;
          },
          0
        );
        const campaign = await BeneficiaryService.findCampaignBeneficiary(
          beneficiary.id
        );
        const ngo = await CampaignService.getCampaignWithBeneficiaries(
          campaign[0].CampaignId
        );
        beneficiary.dataValues.total_amount_spent = sum;
        beneficiary.dataValues.total_campaign = campaign.length;
        beneficiary.dataValues.organisationId = ngo.OrganisationId;
        delete beneficiary.dataValues.OrderTransaction;
      }
      Response.setSuccess(200, 'Beneficiaries retrieved', allBeneficiaries);
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getBeneficiaryAmountAndCampaignsTotal(req, res) {
    const {beneficiary_id} = req.params;

    try {
      let total = await TransactionService.getBeneficiaryTotalTransactionAmountAdmin(
        beneficiary_id
      );
      const campaigns = await CampaignService.beneficiaryCampaingsAdmin(
        beneficiary_id
      );
      const campaignCount = Object.keys(campaigns).length;

      let spend_for_campaign = total.map(a => a.dataValues.amount);
      let spentSum = 0;
      for (let i = 0; i < spend_for_campaign.length; i++) {
        spentSum += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(200, 'Spent and campaign total retrieved', {
        spentSum,
        campaignCount
      });

      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getAllCampaigns(req, res) {
    try {
      const query = SanitizeObject(req.query, ['type']);
      const allCampaign = await CampaignService.getAllCampaigns({
        ...query
      });

      for (let campaign of allCampaign) {
        campaign.dataValues.total_amount = campaign.budget;
        campaign.dataValues.total_amount_spent = campaign.amount_disbursed;
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign retrieved',
        allCampaign
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.' + error
      );
      return Response.send(res);
    }
  }

  static async getAllDonors(req, res) {
    try {
      const allDonors = await OrganisationService.getAllDonorsAdmin();

      for (let donor of allDonors) {
        const transactions = await TransactionService.findTransactions({
          OrganisationId: donor.id,
          BeneficiaryId: null,
          transaction_type: 'transfer',
          is_approved: true,
          status: 'success'
        });
        const userExist = await UserService.findByEmail(donor.email);
        const sum = transactions.reduce((accumulator, object) => {
          return accumulator + object.amount;
        }, 0);
        donor.dataValues.total_campaign = donor.associatedCampaigns.length;
        const ngos = [
          ...new Set(donor.associatedCampaigns.map(item => item.OrganisationId))
        ];
        donor.dataValues.total_donation = sum;
        donor.dataValues.total_ngo = ngos.length;
        donor.dataValues.UserId = userExist.id;
        donor.dataValues.status = userExist.status;
        delete donor.dataValues.associatedCampaigns;
      }

      // for (let users of allDonors) {
      //   for (let organisation of users.Organisations) {
      //     const campaign = await OrganisationService.getAssociatedCampaigns(
      //       organisation.id
      //     );
      //     const sum = organisation.Transactions.reduce(
      //       (accumulator, object) => {
      //         return accumulator + object.amount;
      //       },
      //       0
      //     );
      //     organisation.dataValues.AssociatedCampaign = campaign;
      //     organisation.dataValues.total_donation = sum;
      //   }
      // }
      if (allDonors.length > 0) {
        Response.setSuccess(200, 'Donors retrieved', allDonors);
      } else {
        Response.setSuccess(200, 'No Donors found');
      }
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getDonorCampaignCount(req, res) {
    try {
      const userId = await db.User.findOne({
        where: {
          id: req.params.donor_id
        }
      });

      const donor = await db.Organisation.findOne({
        where: {
          email: userId.email
        }
      });

      if (!donor) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'User not a donor'
        );
        return Response.send(res);
      }

      let total = await TransactionService.getTotalTransactionAmountAdmin(
        donor.id
      );
      const campaigns = await CampaignService.getPrivateCampaignsAdmin(
        donor.id
      );
      // const campaignsCount = Object.keys(campaigns).length

      let spend_for_campaign = total.map(a => a.dataValues.amount);
      let disbursedSum = 0;
      for (let i = 0; i < spend_for_campaign.length; i++) {
        disbursedSum += Math.floor(spend_for_campaign[i]);
      }

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaigns.', {
        disbursedSum,
        campaigns
      });
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }
}

setInterval(async () => {
  const user = await db.User.findOne({
    where: {
      RoleId: AclRoles.SuperAdmin
    }
  });
  let resp;
  if (process.env.NODE_ENV === 'production') {
    await axios
      .get(
        `https://api.ng.termii.com/api/get-balance?api_key=${termiiConfig.api_key}`
      )
      .then(async result => {
        resp = result.data;
        if (resp.balance <= 100) {
          await SmsService.sendAdminSmsCredit(user.phone, resp.balance);
          await MailerService.sendAdminSmsCreditMail(user.email, resp.balance);
          console.log('SMS balance is getting low');
        }
      })
      .catch(error => {
        console.log('error', error.message);
      });
  }
}, 86400000);

setInterval(async () => {
  const user = await db.User.findOne({
    where: {
      RoleId: AclRoles.SuperAdmin
    }
  });

  const options = {
    port: 443,
    method: 'GET',
    headers: {
      'x-api-key': ` ${process.env.IDENTITY_API_KEY}`
    }
  };

  await axios
    .get(
      'https://api.myidentitypay.com/api/v1/biometrics/merchant/data/wallet/balance',
      options
    )
    .then(async result => {
      let resp;
      resp = result.data;
      if (resp.balance <= 4000) {
        await SmsService.sendAdminNinCredit(user.phone, resp.balance);
        await MailerService.sendAdminNinCreditMail(user.email, resp.balance);
        console.log('NIN balance is getting low');
      }
    })
    .catch(error => {
      console.log('error', error.message);
    });
}, 3600000);

setInterval(async () => {
  const user = await db.User.findOne({
    where: {
      RoleId: AclRoles.SuperAdmin
    }
  });
  if (process.env.NODE_ENV === 'production') {
    const balance = await BlockchainService.getNativeBalance(
      '0x9bd10E18842Eabe5Bd2ef3B12c831647FC84BF63'
    );
    if (parseInt(balance) < 2) {
      await MailerService.sendAdminBlockchainCreditMail(user.email, balance);
      await SmsService.sendAdminBlockchainCredit(user.phone, balance);
      console.log('Blockchain gas is getting low');
    } else {
      console.log('Blockchain gas is funded');
    }
  }
}, 3600000);

module.exports = AdminController;
