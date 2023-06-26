const {
  CampaignService,
  ComplaintService,
  BeneficiaryService,
  OrganisationService,
  SmsService,
  QueueService,
  UserService,
  WalletService,
  TaskService,
  BlockchainService,
  AwsService,
  TransactionService
} = require('../services');
const Validator = require('validatorjs');
const db = require('../models');
const {Op} = require('sequelize');
const moment = require('moment');
const {Message} = require('@droidsolutions-oss/amqp-ts');
const {Response, Logger} = require('../libs');
const {
  HttpStatusCode,
  SanitizeObject,
  generateQrcodeURL,
  GenearteVendorId,
  GenearteSMSToken,
  AclRoles,
  generateTransactionRef
} = require('../utils');

const amqp_1 = require('../libs/RabbitMQ/Connection');
const {async} = require('regenerator-runtime');
const Pagination = require('../utils/pagination');
const {generateOTP} = require('../libs/Utils');
const approveToSpendQueue = amqp_1['default'].declareQueue('approveToSpend', {
  durable: true
});
const createWalletQueue = amqp_1['default'].declareQueue('createWallet', {
  durable: true
});

class CampaignController {
  static async addBeneficiaryComplaint(req, res) {
    try {
      const {report} = SanitizeObject(req.body, ['report']);
      const UserId = req.user.id;
      const complaint = await ComplaintService.createComplaint({
        CampaignId: req.campaign.id,
        UserId,
        report
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Complaint Submitted.',
        complaint
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async getBeneficiaryCampaignComplaint(req, res) {
    try {
      const filter = SanitizeObject(req.query, ['status']);
      const Campaign = req.campaign.toJSON();
      filter.CampaignId = Campaign.id;
      const {count: complaints_count, rows: Complaints} =
        await ComplaintService.getBeneficiaryComplaints(req.user.id, filter);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Campaign Complaints.',
        {
          ...Campaign,
          complaints_count,
          Complaints
        }
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async getBeneficiaryCampaigns(req, res) {
    try {
      const filter = SanitizeObject(req.query, ['status', 'type']);
      const campaigns = await CampaignService.beneficiaryCampaings(
        req.user.id,
        filter
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Campaigns.',
        campaigns
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async getAllCampaigns(req, res) {
    try {
      const query = SanitizeObject(req.query, ['type']);
      const allCampaign = await CampaignService.getAllCampaigns({
        ...query,
        status: 'active'
      });

      await Promise.all(
        allCampaign.map(async campaign => {
          campaign.dataValues.ck8 =
            (await AwsService.getMnemonic(campaign.id)) || null;
        })
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign retrieved',
        allCampaign
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async getAllOurCampaigns(req, res) {
    try {
      const type = req.query.type ? req.query.type : 'campaign';

      const allowed_types = ['campaign', 'cash-for-work'];
      if (!allowed_types.includes(type)) {
        type = 'campaign';
      }
      const OrganisationId = req.params.id;
      const organisation_exist = await db.Organisations.findOne({
        where: {
          id: OrganisationId
        },
        include: 'Member'
      });

      if (organisation_exist) {
        const members = organisation_exist['Member'].map(element => {
          return element.id;
        });
        let campaignsArray = [];
        const campaigns = await db.Campaign.findAll({
          where: {
            OrganisationMemberId: {
              [Op.or]: members
            },
            type: type
          }
        });
        for (let campaign of campaigns) {
          let beneficiaries_count = await campaign.countBeneficiaries();
          campaignsArray.push({
            id: campaign.id,
            title: campaign.title,
            type: campaign.type,
            description: campaign.description,
            status: campaign.status,
            budget: campaign.budget,
            location: campaign.location,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            createdAt: campaign.createdAt,
            updatedAt: campaign.updatedAt,
            beneficiaries_count: beneficiaries_count
          });
        }
        Response.setSuccess(200, 'Campaigns Retrieved', campaignsArray);
        return Response.send(res);
      } else {
        Response.setError(422, 'Invalid Organisation Id');
        return Response.send(res);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }
  static async beneficiariesToCampaign(req, res) {
    try {
      const campaign_exist = await db.Campaign.findOne({
        where: {
          id: req.params.campaignId,
          type: 'campaign'
        }
      });
      if (campaign_exist) {
        let beneficiaries = req.body.users;

        const users = beneficiaries.map(element => {
          return element.UserId;
        });
        const main = [...new Set(users)];

        const beneficiaries_already_added = await db.Beneficiaries.findAll({
          where: {
            CampaignId: req.params.campaignId,
            UserId: {
              [Op.or]: main
            }
          }
        });

        if (!beneficiaries_already_added.length) {
          main.forEach(async element => {
            await db.Beneficiaries.create({
              UserId: element,
              CampaignId: req.params.campaignId
            }).then(() => {
              createWalletQueue.send(
                new Message(
                  {
                    id: element,
                    campaign: req.params.campaignId,
                    type: 'user'
                  },
                  {
                    contentType: 'application/json'
                  }
                )
              );
            });
          });

          Response.setSuccess(
            201,
            'Beneficiaries Added To Campaign Successfully'
          );
          return Response.send(res);
        } else {
          Response.setError(
            422,
            'Some User(s) has already been added as Beneficiaries to the campaign'
          );
          return Response.send(res);
        }
      } else {
        Response.setError(422, 'Invalid Campaign Id');
        return Response.send(res);
      }
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }

  /**
   * Funding of Beneficiaries Wallet
   * @param req http request header
   * @param res http response header
   * @async
   */

  // REFACTORED

  static async networkChain(req, res) {
    try {
      const networkChain = ['POLYGON'];
      const currency = ['USDT', 'BTC', 'XRP', 'XDP'];

      const net_cur = {
        networkChain,
        currency
      };

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Chain and currency retrieved',
        net_cur
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Contact Support!..'
      );
      return Response.send(res);
    }
  }

  static async cryptoPayment(req, res) {
    const {campaign_id} = req.params;
    const {currency} = SanitizeObject(req.body);
    try {
      let body = {
        clientEmailAddress: `campaign_${campaign_id}@campaign_${campaign_id}.com"`,
        currency: currency,
        networkChain: 'POLYGON',
        publicKey: process.env.SWITCH_WALLET_PUBLIC_KEY
      };

      const findCampaign = await CampaignService.getCampaignById(campaign_id);
      if (!findCampaign) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          `Campaign with this ID: ${campaign_id} is not found`
        );
        return Response.send(res);
      }

      const wallet = await BlockchainService.switchGenerateAddress(body);
      const qr = await generateQrcodeURL(
        JSON.stringify({
          'campaign title': findCampaign.title,
          address: wallet.address
        })
      );
      wallet.qrCode = qr;
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        `Wallet info received`,
        wallet
      );
      return Response.send(res);
    } catch (error) {
      Logger.error(`Internal Server Error. Contact Support!.. ${error}`);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Contact Support!..'
      );
      return Response.send(res);
    }
  }
  static async approveAndFundBeneficiaries(req, res) {
    const {organisation_id, campaign_id} = req.params;
    const {token_type} = req.body;

    try {
      const campaign_token = await BlockchainService.setUserKeypair(
        `campaign_${campaign_id}`
      );
      const token = await BlockchainService.balance(campaign_token.address);
      const balance = Number(token.Balance.split(',').join(''));
      const beneficiaries =
        await BeneficiaryService.getApprovedFundBeneficiaries(campaign_id);
      const realBeneficiaries = beneficiaries
        .map(exist => exist.User && exist)
        .filter(x => !!x);
      const campaign = await CampaignService.getCampaignWallet(
        campaign_id,
        organisation_id
      );
      const campaignWallet = campaign.Wallet;
      const organisation = await OrganisationService.getOrganisationWallet(
        organisation_id
      );

      const OrgWallet = organisation.Wallet;

      if (campaign.status == 'completed') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already completed'
        );
        return Response.send(res);
      }
      if (campaign.status == 'ended') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already ended'
        );
        return Response.send(res);
      }
      if (campaign.status == 'ongoing') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already ongoing'
        );
        return Response.send(res);
      }

      if (campaign.type !== 'item' && balance == 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance. Please fund campaign wallet.'
        );
        return Response.send(res);
      }
      if (campaign.type === 'campaign' && !realBeneficiaries.length) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign has no approved beneficiaries.'
        );
        return Response.send(res);
      }
      if (!(campaign.start_date >= Date.now())) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign must start after today'
        );
        return Response.send(res);
      }

      for (let user of realBeneficiaries) {
        user.dataValues.formAnswer = null;
        if (user.formAnswer) {
          const answers = await CampaignService.findCampaignFormAnswer({
            campaignId: campaign_id,
            beneficiaryId: user.UserId
          });
          user.dataValues.formAnswer = answers;
        }
      }

      if (campaign.type === 'item') {
        await QueueService.fundNFTBeneficiaries(
          campaign,
          realBeneficiaries,
          token_type,
          campaign.minting_limit
        );
      } else {
        QueueService.fundBeneficiaries(
          OrgWallet,
          campaignWallet,
          realBeneficiaries,
          campaign,
          token_type
        );
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `Campaign fund with ${realBeneficiaries.length} beneficiaries is Processing.`
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message
      );
      return Response.send(res);
    }
  }

  static async fundCampaignWithCrypto(req, res) {
    const {organisation_id, campaign_id} = req.params;
    const {amount} = req.body;
    try {
      const campaign = await CampaignService.getCampaignWallet(
        campaign_id,
        organisation_id
      );
      const organisation = await OrganisationService.getOrganisationWallet(
        organisation_id
      );
      const campaignWallet = campaign.Wallet;
      const OrgWallet = organisation.Wallet;
      if (campaign.status == 'completed') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already completed'
        );
        return Response.send(res);
      }
      if (campaign.status == 'ended') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already ended'
        );
        return Response.send(res);
      }
      if (campaign.status == 'ongoing') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already ongoing'
        );
        return Response.send(res);
      }
      await QueueService.fundCampaignWithCrypto(
        campaign,
        amount,
        campaignWallet,
        OrgWallet
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `Campaign fund with ${amount} is Processing.`,
        transaction
      );
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message
      );
      return Response.send(res);
    }
  }
  static async approveAndFundCampaign(req, res) {
    const {organisation_id, campaign_id} = req.params;
    try {
      const organisation_token = await BlockchainService.setUserKeypair(
        `organisation_${organisation_id}`
      );
      const token = await BlockchainService.balance(organisation_token.address);
      const balance = Number(token.Balance.split(',').join(''));
      const campaign = await CampaignService.getCampaignWallet(
        campaign_id,
        organisation_id
      );
      const campaignWallet = campaign.Wallet;
      const organisation = await OrganisationService.getOrganisationWallet(
        organisation_id
      );

      const OrgWallet = organisation.Wallet;

      if (campaign.status == 'completed') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already completed'
        );
        return Response.send(res);
      }
      if (campaign.status == 'ended') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already ended'
        );
        return Response.send(res);
      }
      if (campaign.status == 'ongoing') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign already ongoing'
        );
        return Response.send(res);
      }

      if (
        (campaign.type !== 'item' && campaign.budget > balance) ||
        (campaign.type !== 'item' && balance == 0)
      ) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance. Please fund organisation wallet.'
        );
        return Response.send(res);
      }

      if (campaign.type === 'item' && campaign.minting_limit == 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Kindly set number of item to mint'
        );
        return Response.send(res);
      }
      if (campaign.type === 'item') {
        await QueueService.confirmAndSetMintingLimit(
          campaign,
          campaign.collection_hash
        );
      } else {
        await QueueService.CampaignApproveAndFund(
          campaign,
          campaignWallet,
          OrgWallet
        );
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `Organisation fund to campaign is Processing.`
      );
      return Response.send(res);
    } catch (error) {
      Logger.error(
        `Error Processing Transfer From NGO Wallet to Campaign Wallet: ${JSON.stringify(
          error
        )}`
      );
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message
      );
      return Response.send(res);
    }
  }

  static async rejectSubmission(req, res) {
    const {taskAssignmentId} = req.params;
    try {
      const assignment = await db.TaskAssignment.findByPk(taskAssignmentId);
      if (!assignment) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Task Assignment Not Found'
        );
        return Response.send(res);
      }
      if (!assignment.uploaded_evidence) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Kindly upload evidence'
        );
        return Response.send(res);
      }
      const updated = await db.TaskAssignment.update(
        {status: 'rejected'},
        {where: {id: taskAssignmentId}}
      );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Task rejected', updated);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message
      );
      return Response.send(res);
    }
  }

  static async fundApprovedBeneficiary(req, res) {
    const {organisation_id, campaign_id} = req.params;
    const {beneficiaryId, taskAssignmentId} = req.body;

    try {
      const campaign = await CampaignService.getCampaignWallet(
        campaign_id,
        organisation_id
      );
      const campaignWallet = campaign.Wallet;
      const beneficiaryWallet = await WalletService.findUserCampaignWallet(
        beneficiaryId,
        campaign_id
      );

      const task_assignment = await db.TaskAssignment.findByPk(
        taskAssignmentId
      );
      const task = await db.Task.findOne({where: {id: task_assignment.TaskId}});

      const amount_disburse = task.amount / task.assignment_count;
      if (!task_assignment) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          `Task Assignment Not Found`,
          task_assignment
        );
        return Response.send(res);
      }

      if (amount_disburse > campaign.budget) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance. Please fund organisation wallet.'
        );
        return Response.send(res);
      }

      await QueueService.FundBeneficiary(
        beneficiaryWallet,
        campaignWallet,
        task_assignment,
        amount_disburse
      );
      Response.setSuccess(HttpStatusCode.STATUS_OK, `Transaction Processing`);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message
      );
      return Response.send(res);
    }
  }
  static async sendSMStoken(req, res) {
    try {
      const beneficiary = req.body.beneficiaryIds;

      const user = await UserService.getAllUsers();
      let foundbeneneficiary = [];
      const tokens = await db.VoucherToken.findAll();
      beneficiary.forEach(data => {
        var phone = user.filter(user => user.id === data);
        foundbeneneficiary.push(phone[0]);
      });

      tokens.forEach(data => {
        foundbeneneficiary.map(user => {
          SmsService.sendOtp(
            user.phone,
            `Hi, ${
              user.first_name || user.last_Name
                ? user.first_name + ' ' + user.last_Name
                : ''
            } your CHATS token is ${data.token} and you are approved to spend ${
              data.amount
            }`
          );
        });
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `SMS token sent to ${foundbeneneficiary.length} beneficiaries.`,
        foundbeneneficiary
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message
      );
      return Response.send(res);
    }
  }

  static async campaignTokens(req, res) {
    const {campaign_id, organisation_id, token_type} = req.params;
    const OrganisationId = organisation_id;

    let where = {
      tokenType: token_type,
      organisationId: OrganisationId,
      campaignId: campaign_id
    };

    const {page, size} = req.query;

    const {limit, offset} = await Pagination.getPagination(page, size);

    let options = {};
    if (page && size) {
      options.limit = limit;
      options.offset = offset;
    }
    try {
      const tokencount = await db.VoucherToken.findAndCountAll({
        where,
        ...options
      });
      const response = await Pagination.getPagingData(tokencount, page, limit);
      const user = await UserService.getAllUsers();
      const campaign = await CampaignService.getAllCampaigns({OrganisationId});
      const singleCampaign = await CampaignService.getCampaignById(campaign_id);

      for (let data of response.data) {
        if (singleCampaign.type !== 'item') {
          const campaignAddress = await BlockchainService.setUserKeypair(
            `campaign_${campaign_id}`
          );
          const beneficiaryAddress = await BlockchainService.setUserKeypair(
            `user_${data.beneficiaryId}campaign_${campaign_id}`
          );
          const token = await BlockchainService.allowance(
            campaignAddress.address,
            beneficiaryAddress.address
          );
          const balance = Number(token.Allowed.split(',').join(''));
          data.dataValues.amount = balance || data.amount;
        }
        var filteredKeywords = user.filter(
          user => user.id === data.beneficiaryId
        );
        data.dataValues.Beneficiary = filteredKeywords[0];
      }

      response.data.forEach(data => {
        var filteredKeywords = user.filter(
          user => user.id === data.beneficiaryId
        );
        data.dataValues.Beneficiary = filteredKeywords[0];
      });

      response.data.forEach(data => {
        var filteredKeywords = campaign.filter(
          camp => camp.id === data.campaignId
        );

        data.dataValues.Campaign = filteredKeywords[0];
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `Found ${response.data.length} ${token_type}.`,
        response
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message
      );
      return Response.send(res);
    }
  }
  static async addCampaign(req, res) {
    if (!req.body.title || !req.body.budget || !req.body.start_date) {
      Response.setError(400, 'Please Provide complete details');
      return Response.send(res);
    }
    const newCampaign = req.body;
    newCampaign.status = 1;
    newCampaign.location = JSON.stringify(req.body.location);
    // newCampaign.type = 1;
    try {
      const createdCampaign = await CampaignService.addCampaign(newCampaign);
      Response.setSuccess(
        201,
        'Campaign Created Successfully!',
        createdCampaign
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error.message);
      return Response.send(res);
    }
  }
  static async toggleCampaign(req, res) {
    const {campaign_id} = req.params;
    try {
      const campaign = await CampaignService.getCampaignById(campaign_id);
      if (!campaign) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          `Campaign With ID :${campaign_id} Not Found`
        );
        return Response.send(res);
      }
      await campaign.update({is_public: !campaign.is_public});
      Response.setSuccess(HttpStatusCode.STATUS_OK, `Campaign updated`);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message
      );
      return Response.send(res);
    }
  }
  static async updatedCampaign(req, res) {
    const alteredCampaign = req.body;
    const {id} = req.params;
    if (!Number(id)) {
      Response.setError(400, 'Please input a valid numeric value');
      return Response.send(res);
    }
    try {
      const updateCampaign = await CampaignService.updateCampaign(
        id,
        alteredCampaign
      );
      if (!updateCampaign) {
        Response.setError(404, `Cannot find Campaign with the id: ${id}`);
      } else {
        Response.setSuccess(200, 'Campaign updated', updateCampaign);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(404, error);
      return Response.send(res);
    }
  }

  static async getACampaign(req, res) {
    const {id} = req.params;
    if (!Number(id)) {
      Response.setError(400, 'Please input a valid numeric value');
      return Response.send(res);
    }

    try {
      const theCampaign = await db.Campaign.findOne({
        where: {
          id,
          type: 'campaign'
        },
        include: {
          model: db.Beneficiaries,
          as: 'Beneficiaries',
          attributes: {
            exclude: ['CampaignId']
          },
          include: {
            model: db.User,
            as: 'User',
            where: {
              status: 'activated'
            },
            attributes: {
              exclude: [
                'nfc',
                'password',
                'dob',
                'profile_pic',
                'location',
                'is_email_verified',
                'is_phone_verified',
                'is_bvn_verified',
                'is_self_signup',
                'is_public',
                'is_tfa_enabled',
                'last_login',
                'tfa_secret',
                'bvn',
                'nin',
                'pin'
              ]
            }
          }
        }
      });
      if (!theCampaign) {
        Response.setError(404, `Cannot find Campaign with the id ${id}`);
      } else {
        Response.setSuccess(200, 'Found Campaign', theCampaign);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(500, error);
      return Response.send(res);
    }
  }

  static async deleteCampaign(req, res) {
    const {id} = req.params;
    if (!Number(id)) {
      Response.setError(400, 'Please provide a numeric value');
      return Response.send(res);
    }

    try {
      const CampaignToDelete = await CampaignService.deleteCampaign(id);
      if (CampaignToDelete) {
        Response.setSuccess(200, 'Campaign deleted');
      } else {
        Response.setError(404, `Campaign with the id ${id} cannot be found`);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }
  static async complaints(req, res) {
    const campaign = req.params.campaignId;
    let campaignExist = await db.Campaign.findByPk(campaign);
    if (!campaignExist) {
      Response.setError(422, 'Campaign Invalid');
      return Response.send(res);
    }
    const beneficiaries = await campaignExist.getBeneficiaries();

    const finalData = beneficiaries.map(beneficiary => {
      return beneficiary.id;
    });

    var whereCondtion = {
      BeneficiaryId: {
        [Op.or]: finalData
      }
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

    Response.setSuccess(200, 'Complaints Retrieved', {
      complaints: docs,
      current_page: options.page,
      pages: pages,
      total: total,
      nextPage: nextPage,
      prevPage: prevPage
    });
    return Response.send(res);
  }

  static async getCampaign(req, res) {
    try {
      let assignmentTask = [];
      const campaignId = req.params.campaign_id;
      const OrganisationId = req.params.organisation_id;
      const campaign_token = await BlockchainService.setUserKeypair(
        `campaign_${campaignId}`
      );
      const token = await BlockchainService.balance(campaign_token.address);
      const balance = Number(token.Balance.split(',').join(''));
      const campaign = await CampaignService.getCampaignWithBeneficiaries(
        campaignId
      );
      const campaignWallet = await WalletService.findOrganisationCampaignWallet(
        OrganisationId,
        campaignId
      );
      if (!campaignWallet) {
        await QueueService.createWallet(
          OrganisationId,
          'organisation',
          campaignId
        );
      }
      if (campaign.Beneficiaries) {
        campaign.Beneficiaries.forEach(async data => {
          const userWallet = await WalletService.findUserCampaignWallet(
            data.id,
            campaignId
          );
          if (!userWallet) {
            await QueueService.createWallet(data.id, 'user', campaignId);
          }
        });
      }
      campaign.dataValues.completed_task = 0;
      for (let task of campaign.Jobs) {
        const assignment = await db.TaskAssignment.findOne({
          where: {TaskId: task.id, status: 'completed'}
        });
        assignmentTask.push(assignment);
      }

      function isExist(id) {
        let find = assignmentTask.find(a => a && a.TaskId === id);
        if (find) {
          return true;
        }
        return false;
      }
      if (campaign.Jobs) {
        campaign.Jobs.forEach(async task => {
          if (isExist(task.id)) {
            campaign.dataValues.completed_task++;
          }
        });
      }
      campaign.dataValues.balance = balance;
      campaign.dataValues.address = campaign_token.address;
      campaign.dataValues.beneficiaries_count = campaign.Beneficiaries.length;
      campaign.dataValues.task_count = campaign.Jobs.length;
      campaign.dataValues.beneficiary_share =
        campaign.dataValues.beneficiaries_count > 0
          ? (campaign.budget / campaign.dataValues.beneficiaries_count).toFixed(
              2
            )
          : 0;
      campaign.dataValues.amount_spent = (
        campaign.amount_disbursed -
        campaign.BeneficiariesWallets.map(balance => balance).reduce(
          (a, b) => a + b,
          0
        )
      ).toFixed(2);
      campaign.dataValues.Complaints = '';
      await CampaignService.getCampaignComplaint(campaignId);
      // (await AwsService.getMnemonic(campaign.id)) || null;
      campaign.dataValues.ck8 = '';

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Details',
        campaign
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.` + error
      );
      return Response.send(res);
    }
  }

  static async getPrivateCampaign(req, res) {
    try {
      let assignmentTask = [];
      const campaignId = req.params.campaign_id;
      const OrganisationId = req.params.organisation_id;
      const campaign_token = await BlockchainService.setUserKeypair(
        `campaign_${campaignId}`
      );
      const token = await BlockchainService.balance(campaign_token.address);
      const balance = Number(token.Balance.split(',').join(''));
      const campaign =
        await CampaignService.getPrivateCampaignWithBeneficiaries(campaignId);
      const campaignWallet = await WalletService.findOrganisationCampaignWallet(
        OrganisationId,
        campaignId
      );
      if (!campaignWallet) {
        await QueueService.createWallet(
          OrganisationId,
          'organisation',
          campaignId
        );
      }
      if (campaign.Beneficiaries) {
        campaign.Beneficiaries.forEach(async data => {
          const userWallet = await WalletService.findUserCampaignWallet(
            data.id,
            campaignId
          );
          if (!userWallet) {
            await QueueService.createWallet(data.id, 'user', campaignId);
          }
        });
      }
      campaign.dataValues.completed_task = 0;
      for (let task of campaign.Jobs) {
        const assignment = await db.TaskAssignment.findOne({
          where: {TaskId: task.id, status: 'completed'}
        });
        assignmentTask.push(assignment);
      }

      function isExist(id) {
        let find = assignmentTask.find(a => a && a.TaskId === id);
        if (find) {
          return true;
        }
        return false;
      }
      if (campaign.Jobs) {
        campaign.Jobs.forEach(async task => {
          if (isExist(task.id)) {
            campaign.dataValues.completed_task++;
          }
        });
      }
      campaign.dataValues.balance = balance;
      campaign.dataValues.address = campaign_token.address;
      campaign.dataValues.beneficiaries_count = campaign.Beneficiaries.length;
      campaign.dataValues.task_count = campaign.Jobs.length;
      campaign.dataValues.beneficiary_share =
        campaign.dataValues.beneficiaries_count > 0
          ? (campaign.budget / campaign.dataValues.beneficiaries_count).toFixed(
              2
            )
          : 0;
      campaign.dataValues.amount_spent = (
        campaign.amount_disbursed -
        campaign.BeneficiariesWallets.map(balance => balance).reduce(
          (a, b) => a + b,
          0
        )
      ).toFixed(2);
      campaign.dataValues.Complaints =
        await CampaignService.getCampaignComplaint(campaignId);
      campaign.dataValues.ck8 =
        (await AwsService.getMnemonic(campaign.id)) || null;
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Details',
        campaign
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.` + error
      );
      return Response.send(res);
    }
  }

  static async campaignsWithOnboardedBeneficiary(req, res) {
    const {campaign_id} = req.params;
    try {
      const approved = [];
      const campaign = await CampaignService.getACampaignWithBeneficiaries(
        campaign_id,
        'campaign'
      );
      campaign.forEach(app => {
        if (app.Beneficiaries.length)
          approved.push({
            id: app.id,
            OrganisationId: app.OrganisationId,
            title: app.title,
            type: app.type,
            spending: app.spending,
            description: app.description,
            total_beneficiaries: app.Beneficiaries.length
          });
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `Campaigns with onboarded ${
          approved.length > 1 ? 'beneficiaries' : 'beneficiary'
        }`,
        approved
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.` + error
      );
      return Response.send(res);
    }
  }
  static async importBeneficiary(req, res) {
    const {campaign_id, replicaCampaignId} = req.params;
    try {
      const {source, type} = SanitizeObject(req.body, ['source', 'type']);

      const replicaCampaign = await CampaignService.getACampaignWithReplica(
        replicaCampaignId,
        type
      );
      const onboard = [];

      //const campaign = await CampaignService.getCampaignById(campaign_id);

      // if (campaign.formId) {
      //   Response.setError(
      //     HttpStatusCode.STATUS_BAD_REQUEST,
      //     `Campaign Has a Form Please Onboard Beneficiary From Field App`
      //   );
      //   return Response.send(res);
      // }
      await Promise.all(
        replicaCampaign.Beneficiaries.map(async (beneficiary, index) => {
          setTimeout(async () => {
            const res = await CampaignService.addBeneficiary(
              campaign_id,
              beneficiary.id,
              source
            );
            onboard.push(res);
          }, index * 5000);
        })
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `Onboarding  ${replicaCampaign.Beneficiaries.length}${
          replicaCampaign.Beneficiaries.length > 1
            ? ' beneficiaries'
            : 'beneficiary'
        } to campaign is processing`,
        onboard
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`
      );
      return Response.send(res);
    }
  }

  static async withdrawFund(req, res) {
    const id = req.params.campaign_id;
    try {
      const campaign = await CampaignService.getCampaignById(id);
      if (!campaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Campaign not funded`
        );
        return Response.send(res);
      }
      if (campaign.status !== 'ended') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Campaign has not ended yet`
        );
        return Response.send(res);
      }

      const campaignKeys = await BlockchainService.setUserKeypair(
        `campaign_${id}`
      );
      const token = await BlockchainService.balance(campaignKeys.address);
      const balance = Number(token.Balance.split(',').join(''));

      if (balance === 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Insufficient fund, campaign wallet balance is 0`
        );
        return Response.send(res);
      }
      await QueueService.withHoldFunds(id, campaign.OrganisationId, balance);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Funds withdrawal processing',
        balance
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.` + error
      );
      return Response.send(res);
    }
  }
  static async campaignInfo(req, res) {
    try {
      let eighteenTo29 = 0;
      let thirtyTo41 = 0;
      let forty2To53 = 0;
      let fifty4To65 = 0;
      let sixty6Up = 0;
      let male = 0;
      let female = 0;
      let Lagos = 0,
        Abuja = 0,
        Kaduna = 0,
        Jos = 0;
      let married = 0;
      let single = 0;
      let divorce = 0;
      const [campaign, vendor] = await Promise.all([
        CampaignService.getCampaignById(req.params.campaign_id),
        CampaignService.campaignVendors(req.params.campaign_id)
      ]);
      if (campaign.Beneficiaries) {
        for (let beneficiaries of campaign.Beneficiaries) {
          if (beneficiaries.location.includes('state')) {
            let parsedJson = JSON.parse(beneficiaries.location);
            if (parsedJson.state === 'Abuja') Abuja++;
            if (parsedJson.state === 'Lagos') Lagos++;
            if (parsedJson.state === 'Kaduna') Kaduna++;
            if (parsedJson.state === 'Jos') Jos++;
          }
          if (
            parseInt(
              moment().format('YYYY') - moment(beneficiaries.dob).format('YYYY')
            ) >= 18 &&
            parseInt(
              moment().format('YYYY') - moment(beneficiaries.dob).format('YYYY')
            ) <= 29
          ) {
            eighteenTo29++;
          }
          if (
            parseInt(
              moment().format('YYYY') - moment(beneficiaries.dob).format('YYYY')
            ) >= 30 &&
            parseInt(
              moment().format('YYYY') - moment(beneficiaries.dob).format('YYYY')
            ) <= 41
          ) {
            thirtyTo41++;
          }
          if (
            parseInt(
              moment().format('YYYY') - moment(beneficiaries.dob).format('YYYY')
            ) >= 42 &&
            parseInt(
              moment().format('YYYY') - moment(beneficiaries.dob).format('YYYY')
            ) <= 53
          ) {
            forty2To53++;
          }
          if (
            parseInt(
              moment().format('YYYY') - moment(beneficiaries.dob).format('YYYY')
            ) >= 54 &&
            parseInt(
              moment().format('YYYY') - moment(beneficiaries.dob).format('YYYY')
            ) <= 65
          ) {
            fifty4To65++;
          }
          if (
            parseInt(
              moment().format('YYYY') - moment(beneficiaries.dob).format('YYYY')
            ) >= 66
          ) {
            sixty6Up++;
          }
          if (beneficiaries.gender == 'male') {
            male++;
          } else if (beneficiaries.gender == 'female') {
            female++;
          }
          if (beneficiaries.marital_status == 'single') {
            single++;
          } else if (beneficiaries.marital_status == 'married') {
            married++;
          } else if (beneficiaries.marital_status == 'divorce') {
            divorce++;
          }
        }
      }

      campaign.dataValues.vendor_count = vendor.length;
      campaign.dataValues.beneficiaries_count = campaign.Beneficiaries.length;
      campaign.dataValues.Beneficiary_gender = {
        male,
        female
      };
      campaign.dataValues.beneficiary_location = {
        Abuja,
        Kaduna,
        Jos
      };
      campaign.dataValues.Beneficiary_marital_status = {
        married,
        single,
        divorce
      };
      campaign.dataValues.Beneficiary_age = {
        eighteenTo29,
        thirtyTo41,
        forty2To53,
        fifty4To65,
        sixty6Up
      };
      delete campaign.Beneficiaries;
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Info retrieved',
        campaign
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support..ll` + error
      );
      return Response.send(res);
    }
  }

  static async campaignForm(req, res) {
    const id = req.params.organisation_id;
    const data = req.body;
    data.organisationId = id;
    try {
      const rules = {
        title: 'required|string',
        'questions.*.type': 'required|in:multiple,optional,short',
        'questions.*.value': 'numeric',
        'questions.*.required': 'required|boolean',
        'questions.*.question.title': 'required|string',
        'questions.*.question.options': 'array'
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const formExist = await CampaignService.findCampaignFormByTitle(
        data.title
      );
      if (formExist) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Form with similar title exists.'
        );
        return Response.send(res);
      }
      const form = await CampaignService.campaignForm(data);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Campaign form created',
        form
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.` + error
      );
      return Response.send(res);
    }
  }
  static async submitCampaignForm(req, res) {
    const data = req.body;
    data.beneficiaryId = req.user.id;
    try {
      const rules = {
        formId: 'required|numeric',
        'questions.*.question': 'required|string',
        'questions.*.answer': 'required|string'
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }

      const isForm = await CampaignService.findCampaignForm(data.formId);
      if (!isForm) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign form not found'
        );
        return Response.send(res);
      }
      const createdForm = await CampaignService.formAnswer(data);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Answer submitted',
        createdForm
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.` + error
      );
      return Response.send(res);
    }
  }
  static async updateCampaignForm(req, res) {
    const data = req.body;
    try {
      const rules = {
        id: 'required|numeric',
        title: 'required|string',
        'questions.*.type': 'required|in:multiple,optional,short',
        'questions.*.value': 'numeric',
        'questions.*.required': 'required|boolean',
        'questions.*.question.title': 'required|string',
        'questions.*.question.options': 'array'
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }

      const isForm = await CampaignService.findCampaignForm(req.body.id);
      if (!isForm) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign form not found'
        );
        return Response.send(res);
      }
      const formExist = await CampaignService.findCampaignFormByTitle(
        data.title
      );
      if (formExist && formExist.id !== data.id) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Form with similar title exists.'
        );
        return Response.send(res);
      }
      await isForm.update(data);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Campaign form updated',
        isForm
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.` + error
      );
      return Response.send(res);
    }
  }
  static async destroyCampaignForm(req, res) {
    try {
      const rules = {
        formId: 'required:numeric'
      };
      const validation = new Validator(req.body, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const isForm = await CampaignService.findCampaignForm(req.body.formId);
      if (!isForm) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign form not found'
        );
        return Response.send(res);
      }
      if (isForm.campaigns.length) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Form already assigned to a campaign'
        );
        return Response.send(res);
      }
      await isForm.destroy();
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Campaign form successfully deleted',
        isForm
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.` + error
      );
      return Response.send(res);
    }
  }
  static async getSingleCampaignForm(req, res) {
    const id = req.params.form_id;
    try {
      const form = await CampaignService.findCampaignForm(id);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign form received',
        form
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.` + error
      );
      return Response.send(res);
    }
  }
  static async getCampaignForm(req, res) {
    const id = req.params.organisation_id;
    try {
      const form = await CampaignService.getCampaignForm(id, req.query);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign form received',
        form
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.` + error
      );
      return Response.send(res);
    }
  }
}

async function loopCampaigns(campaignId, beneficiaries) {
  try {
    for (let i = 0; i < beneficiaries.length; i++) {
      beneficiaries[i]['CampaignId'] = campaignId;
    }
    return beneficiaries;
  } catch (error) {
    return error;
  }
}

module.exports = CampaignController;
