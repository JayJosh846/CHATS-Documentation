const {Op} = require('sequelize');
const {
  HttpStatusCode,
  SanitizeObject,
  generateOrganisationId,
  generateProductRef,
  GenerateSecrete
} = require('../utils');

const moment = require('moment');
const UserService = require('../services/UserService');
const {Response, Logger} = require('../libs');
const db = require('../models');

const Validator = require('validatorjs');
const formidable = require('formidable');
const fs = require('fs');
const uploadFile = require('./AmazonController');

const amqp = require('./../libs/RabbitMQ/Connection');

const {Message} = require('@droidsolutions-oss/amqp-ts');
const BantuService = require('../services');
const api = require('../libs/Axios');
const {
  CampaignService,
  QueueService,
  OrganisationService,
  BeneficiaryService,
  VendorService,
  BlockchainService,
  ProductService,
  WalletService,
  ZohoService,
  AwsService,
  TransactionService
} = require('../services');
const AwsUploadService = require('../services/AwsUploadService');
const campaign = require('../models/campaign');

const createWalletQueue = amqp['default'].declareQueue('createWallet', {
  durable: true
});
const transferToQueue = amqp['default'].declareQueue('transferTo', {
  durable: true
});
const mintTokenQueue = amqp['default'].declareQueue('mintToken', {
  durable: true
});

class OrganisationController {
  static logger = Logger;
  static async register(req, res) {
    const data = req.body;
    const rules = {
      name: 'required|string',
      email: 'required|email',
      phone: 'required|string',
      address: 'required|string',
      location: 'required|string',
      logo_link: 'url'
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      const organisation = await OrganisationService.checkExistEmail(
        data.email
      );

      if (organisation) {
        Response.setError(422, 'Email already taken');
        return Response.send(res);
      } else {
      }
    }
  }

  static async changeOrganisationLogo(req, res) {
    try {
      const file = req.file;
      const ext = req.file.mimetype.split('/').pop();
      const key = `${Date.now()}.${ext}`;
      const buket = 'convexity-ngo-logo';
      const logo_link = await AwsUploadService.uploadFile(file, key, buket);
      await OrganisationService.updateOrganisationProfile(req.organisation.id, {
        logo_link
      });
      const updated = await OrganisationService.findOneById(
        req.organisation.id
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Organisation logo updated.',
        updated
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

  static async verifyImage(req, res) {
    try {
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async completeProfile(req, res) {
    try {
      const organisation = req.organisation;
      const data = SanitizeObject(req.body, [
        'country',
        'state',
        'address',
        'year_of_inception',
        'website_url',
        'about'
      ]);
      data.profile_completed = true;

      if (!organisation.registration_id) {
        data.registration_id = generateOrganisationId();
      }
      await OrganisationService.updateOrganisationProfile(
        organisation.id,
        data
      );
      const updated = await OrganisationService.findOneById(organisation.id);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Organisation profile updated.',
        updated
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

  static async getProfile(req, res) {
    try {
      const profile = await OrganisationService.findOneById(
        req.organisation.id
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Organisation profile.',
        profile
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
  static async getAvailableOrgCampaigns(req, res) {
    try {
      const OrganisationId = req.params.organisation_id;
      const _query = SanitizeObject(req.query, ['type']);
      const query = {
        ..._query,
        status: 'active'
      };
      const campaigns = await CampaignService.getCampaigns(
        OrganisationId,
        ...query
      );
      let campaignsArray = [];
      for (let campaign of campaigns) {
        let beneficiaries_count = await campaign.countBeneficiaries();
        campaignsArray.push({
          id: campaign.id,
          title: campaign.title,
          type: campaign.type,
          description: campaign.description,
          status: campaign.status,
          amount_disbursed: campaign.amount_disbursed,
          budget: campaign.budget,
          funded_with: campaign.funded_with,
          location: campaign.location,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
          beneficiaries_count: beneficiaries_count,
          Jobs: campaign.Jobs,
          ck8: (await AwsUploadService.getMnemonic(campaign.id)) || null
        });
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaigns.',
        campaignsArray
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
  static async getAllNGOs(req, res) {
    try {
      const ngos = await OrganisationService.getAllNGOs();
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'NGOs retrieved.', ngos);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.' + error
      );
      return Response.send(res);
    }
  }
  static async getAllPublicDonorCampaigns(req, res) {
    try {
      let completed_task = 0;
      const assignmentTask = [];
      const query = SanitizeObject(req.query);
      const campaigns = await CampaignService.getPublicCampaigns({
        ...query,
        is_public: true
      });

      for (let campaign of campaigns) {
        if (new Date(campaign.end_date) < new Date())
          campaign.update({status: 'completed'});
        const organisation = await OrganisationService.checkExist(
          campaign.OrganisationId
        );
        campaign.dataValues.Organisation = organisation;
        for (let task of campaign.Jobs) {
          const assignment = await db.TaskAssignment.findOne({
            where: {TaskId: task.id, status: 'completed'}
          });
          assignmentTask.push(assignment);
        }

        (campaign.dataValues.beneficiaries_count =
          campaign.Beneficiaries.length),
          (campaign.dataValues.task_count = campaign.Jobs.length);
        campaign.dataValues.completed_task = completed_task;
      }

      function isExist(id) {
        let find = assignmentTask.find(a => a && a.TaskId === id);
        if (find) {
          return true;
        }
        return false;
      }

      campaigns.forEach(data => {
        data.Jobs.forEach(task => {
          if (isExist(task.id)) {
            data.dataValues.completed_task++;
          }
        });
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaigns.', campaigns);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async getAllPrivateDonorCampaigns(req, res) {
    try {
      let completed_task = 0;
      const assignmentTask = [];

      const organisation = await OrganisationService.checkExistEmail(
        req.user.email
      );
      const query = SanitizeObject(req.query);
      const [campaigns, organisationW, transaction] = await Promise.all([
        CampaignService.getPrivateCampaigns(query, organisation.id),
        OrganisationService.getOrganisationWallet(organisation.id),
        TransactionService.findOrgnaisationTransactions(organisation.id)
      ]);

      if (campaigns?.associatedCampaigns) {
        for (let campaign of campaigns.associatedCampaigns) {
          if (new Date(campaign.end_date) < new Date())
            campaign.update({status: 'completed'});
          for (let task of campaign.Jobs) {
            const assignment = await db.TaskAssignment.findOne({
              where: {TaskId: task.id, status: 'completed'}
            });
            assignmentTask.push(assignment);
          }

          (campaign.dataValues.beneficiaries_count =
            campaign.Beneficiaries.length),
            (campaign.dataValues.task_count = campaign.Jobs.length);
          campaign.dataValues.completed_task = completed_task;

          campaign.dataValues.iDonate = false;
          campaign.dataValues.amount_donated = 0;
          const campaignW = await CampaignService.getCampaignWallet(
            campaign.id,
            organisation.id
          );
          if (
            campaignW !== null &&
            campaignW.Wallet &&
            organisationW !== null &&
            organisationW.Wallet
          ) {
            for (let tran of transaction) {
              if (
                tran.ReceiverWalletId === campaignW.Wallet.uuid &&
                tran.SenderWalletId === organisationW.Wallet.uuid
              ) {
                campaign.dataValues.iDonate = true;
                campaign.dataValues.amount_donated = tran.amount;
                campaign.dataValues.donation_date = tran.createdAt;
              }
            }
          }
        }
      }
      function isExist(id) {
        let find = assignmentTask.find(a => a && a.TaskId === id);
        if (find) {
          return true;
        }
        return false;
      }
      campaigns?.associatedCampaigns.forEach(data => {
        data.Jobs.forEach(task => {
          if (isExist(task.id)) {
            data.dataValues.completed_task++;
          }
        });
      });

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaigns.', campaigns);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.' + error
      );
      return Response.send(res);
    }
  }
  static async getAllOrgCampaigns(req, res) {
    try {
      let completed_task = 0;
      const assignmentTask = [];
      const OrganisationId = req.params.organisation_id;
      const query = SanitizeObject(req.query);
      const campaigns = await CampaignService.getCampaigns(
        OrganisationId,
        query
      );

      for (let data of campaigns?.data) {
        if (new Date(data.end_date) < new Date())
          data.update({status: 'ended'});
        for (let task of data.Jobs) {
          const assignment = await db.TaskAssignment.findOne({
            where: {TaskId: task.id, status: 'completed'}
          });
          assignmentTask.push(assignment);
        }
        //(await AwsService.getMnemonic(data.id)) || null;
        data.dataValues.ck8 = GenerateSecrete();

        data.dataValues.beneficiaries_count = data.Beneficiaries.length;
        data.dataValues.task_count = data.Jobs.length;
        data.dataValues.completed_task = completed_task;
      }
      function isExist(id) {
        let find = assignmentTask.find(a => a && a.TaskId === id);
        if (find) {
          return true;
        }
        return false;
      }
      campaigns &&
        campaigns?.data.forEach(data => {
          data.Jobs.forEach(task => {
            if (isExist(task.id)) {
              data.dataValues.completed_task++;
            }
          });
        });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'All Campaigns.',
        campaigns
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.' + error
      );
      return Response.send(res);
    }
  }

  static async getAllOrgCash4W(req, res) {
    try {
      let task_completed = 0,
        task_uncompleted = 0,
        total_tasks = 0;
      const OrganisationId = req.params.organisation_id;
      const cashforworks = await CampaignService.getCash4W(OrganisationId);

      const campaignJobs = cashforworks.map(campaign => campaign.Jobs);
      const merge = [].concat.apply([], campaignJobs);

      const Jobs = merge.map(jobs => {
        if (jobs.isCompleted == true) {
          task_completed++;
        }
        if (jobs.isCompleted == false) {
          task_uncompleted++;
        }
      });
      total_tasks = Jobs.length;

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'All Cash-For-Work.', {
        task_completed,
        task_uncompleted,
        total_tasks,
        cashforworks
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

  static async totalCashItem(req, res) {
    try {
      const campaign = await CampaignService.getAllCampaigns();
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async getBeneficiariesTransactions(req, res) {
    try {
      const transactions =
        await BeneficiaryService.findOrganisationVendorTransactions(
          req.organisation.id
        );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Beneficiaries transactions.',
        transactions
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

  static async vendorsTransactions(req, res) {
    try {
      const transactions = await VendorService.organisationVendorsTransactions(
        req.organisation.id,
        req.query
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Vendors transactions.',
        transactions
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please try again.'
      );
      return Response.send(res);
    }
  }

  static async addMember(req, res) {
    const data = req.body;
    const rules = {
      user_id: 'required|numeric',
      organisation_id: 'required|numeric',
      role: 'required|string|in:admin,member'
    };
    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      const organisation = await OrganisationService.checkExist(
        data.organisation_id
      );
      const user = await UserService.getAUser(data.user_id);
      var errors = [];
      if (!organisation) {
        errors.push('Organisation is Invalid');
      }
      if (!user) {
        errors.push('User is Invalid');
      }
      if (errors.length) {
        Response.setError(422, errors);
        return Response.send(res);
      } else {
        const is_member = await OrganisationService.isMember(
          organisation.id,
          user.id
        );
        if (!is_member) {
          await organisation
            .createMember({
              UserId: data.user_id,
              role: 'member'
            })
            .then(() => {
              Response.setSuccess(201, 'User Added to NGO successfully.');
              return Response.send(res);
            });
        } else {
          Response.setError(422, 'User is already a member');
          return Response.send(res);
        }
      }
    }
  }

  static async updateOrgCampaign(req, res) {
    try {
      let id = req.params.campaign_id;

      const data = SanitizeObject(req.body, [
        'title',
        'description',
        'budget',
        'location',
        'start_date',
        'end_date',
        'status'
      ]);

      // TODO: Check title conflict

      // Handle update here
      await CampaignService.updateSingleCampaign(id, data);
      const campaign = await CampaignService.getCampaignById(id);

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign updated.',
        campaign
      );
      return Response.send(res);
    } catch (error) {
      console.log({
        error
      });
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Campaign update failed. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async updateCampaign(req, res) {
    const data = req.body;
    const rules = {
      campaignId: 'required|numeric',
      budget: 'required|numeric',
      description: 'required|string',
      spending: 'in:vendor,all',
      status: 'in:pending,in-progress,deleted,paused',
      organisation_id: 'required|numeric'
    };

    const validation = new Validator(data, rules);

    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      const campaignExist = await db.Campaign.findOne({
        where: {
          id: data.campaignId
        }
      });

      if (!campaignExist) {
        Response.setError(400, 'Invalid Campaign Id');
        return Response.send(res);
      }

      const campaignData = {
        budget: data.budget,
        description: data.description
      };

      if (data.status) {
        campaignData['status'] = data.status;
      }

      if (data.spending) {
        campaignData['spending'] = data.spending;
      }

      Response.setSuccess(201, 'Campaign Data updated');
      return Response.send(res);
    }
  }

  static async fetchTransactions(req, res) {
    try {
      const organisationId = req.params.organisationId;

      const organisationExist = await db.Organisations.findOne({
        where: {
          id: organisationId
        },
        include: {
          as: 'Transaction',
          model: db.Transaction
        }
      });

      const mintTransactions = await db.FundAccount.findAll({
        where: {
          OrganisationId: organisationId
        }
      });

      Response.setSuccess(201, 'Transactions', {
        transaction: organisationExist.Transaction,
        mintTransaction: mintTransactions
      });

      return Response.send(res);
    } catch (error) {
      console.log(error.message);
      Response.setSuccess(201, 'Invalid Organisation Id');
      return Response.send(res);
    }
  }

  static async createWallet(req, res) {
    try {
      QueueService.createWallet(OrganisationId, 'organisation', campaign.id);
    } catch (error) {}
  }

  static createItemCampaign(req, res) {
    try {
    } catch (error) {}
  }

  static async createCampaign(req, res) {
    try {
      const rules = {
        formId: 'numeric'
      };

      const validation = new Validator(req.body, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const data = SanitizeObject(req.body);
      const spending = data.type == 'campaign' ? 'vendor' : 'all';
      const OrganisationId = req.organisation.id;

      const OrgWallet = await OrganisationService.getOrganisationWallet(
        OrganisationId
      );
      // const is_verified_all = req.user.is_verified_all;
      // if (!is_verified_all) {
      //   Response.setError(
      //     HttpStatusCode.STATUS_BAD_REQUEST,
      //     'Update your profile first'
      //   );
      //   return Response.send(res);
      // }
      if (data.formId) {
        const form = await CampaignService.findCampaignFormById(data.formId);

        let total = 0;
        form.questions.map(val => {
          const reward = val.question.options.reduce(
            (accumulator, currentValue) => {
              if (isNaN(accumulator + currentValue.reward)) {
                return 0;
              } else return accumulator + currentValue.reward;
            },
            0
          );
          total += reward;
        });
        if (total > data.budget) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'Beneficiary reward greater than budget'
          );
          return Response.send(res);
        }
      }

      if (data.budget > OrgWallet.balance || OrgWallet.balance == 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient Org wallet balance. Try reducing Budget'
        );
        return Response.send(res);
      }
      data.is_processing = false;
      CampaignService.addCampaign({
        ...data,
        spending,
        OrganisationId,
        status: 'pending'
      })
        .then(async campaign => {
          // await QueueService.createWallet(
          //   OrganisationId,
          //   'organisation',
          //   campaign.id
          // );
          // campaign.type === 'item'
          //   ? await QueueService.createCollection(campaign)
          //   : await QueueService.createEscrow(campaign);
          // AwsUploadService.createSecret(campaign.id);
          Response.setSuccess(
            HttpStatusCode.STATUS_CREATED,
            'Created Campaign.',
            campaign
          );
          return Response.send(res);
        })
        .catch(err => {
          Logger.error(err);
          throw err;
        });
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Campaign creation failed. Please retry.' + error
      );
      return Response.send(res);
    }
  }

  static async addCampaignProduct(req, res) {
    try {
      const {body, campaign} = req;

      const product = await ProductService.findCampaignProducts(campaign.id);
      const isExist = product.filter(a => body.find(b => a.tag === b.tag));
      if (isExist.length > 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Product With Tag: ${isExist[0].tag} Already Exist`
        );
        return Response.send(res);
      }

      const products = await Promise.all(
        body.map(async _body => {
          const data = SanitizeObject(
            _body,
            ['type', 'tag', 'cost'] || ['type', 'tag']
          );
          data.product_ref = generateProductRef();
          data.cost = data.type === 'item' ? 1 : data.cost;
          const createdProduct = await db.Product.create({
            ...data,
            CampaignId: campaign.id
          });
          //console.log(createdProduct)
          if (createdProduct) {
            _body.vendors.forEach(async VendorId => {
              await db.VendorProduct.create({
                vendorId: VendorId,
                productId: createdProduct.id
              });
              await CampaignService.approveVendorForCampaign(
                campaign.id,
                VendorId
              );
            });
          }

          return createdProduct;
          //return ProductService.addProduct(data, _body.vendors, campaign.id);
        })
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Product added to stores',
        products
      );
      Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`
      );
      return Response.send(res);
    }
  }
  static async DeleteCampaignProduct(req, res) {
    const {ProductId} = req.body;
    try {
      const iSProduct = await db.Product.findByPk(ProductId);
      if (!iSProduct) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          `Product with this ID  ${ProductId} Not Approved`
        );
        return Response.send(res);
      } else {
        const isVendorDeleted = await db.VendorProduct.destroy({
          where: {
            productId: ProductId
          }
        });
        if (isVendorDeleted)
          await db.Product.destroy({
            where: {
              id: ProductId
            }
          });
        Response.setSuccess(
          HttpStatusCode.STATUS_CREATED,
          'Product Deleted in stores'
        );
        Response.send(res);
      }
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support. ${error}`
      );
      return Response.send(res);
    }
  }

  static async withdrawalRequest(req, res) {
    try {
      const requests = await db.RequestFund.findAll();
      for (let request of requests) {
        const campaign = await CampaignService.getCampaignById(
          request.campaign_id
        );
        request.dataValues.campaign = campaign;
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `Donor withdrawal requests`,
        requests
      );
      return Response.send(res);
    } catch (error) {
      Logger.error(JSON.stringify(error));
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support. ${error}`
      );
      return Response.send(res);
    }
  }
  static async requestFund(req, res) {
    try {
      const campaign = await CampaignService.getCampaignById(
        req.body.campaign_id
      );
      if (campaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Campaign Already Funded`
        );
        return Response.send(res);
      }
      if (campaign.budget === 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Insufficient Fund`
        );
        return Response.send(res);
      }
      const bodyAllowedList = new Set([
        'reason',
        'donor_organisation_id',
        'campaign_id'
      ]);
      for (let prop in req.body) {
        if (req.body.hasOwnProperty(prop) && !bodyAllowedList.has(prop)) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'unexpected parameter in POST body'
          );
          return Response.send(res);
        }
      }

      const request = await db.RequestFund.create(req.body);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        `Request sent`,
        request
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.: ${error}`
      );
      return Response.send(res);
    }
  }

  static async approveOrReject(req, res) {
    try {
      const rules = {
        campaign_id: 'required|numeric',
        type: 'required|string|in:reject,approve',
        request_id: 'required|numeric'
      };

      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(400, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const campaign = await CampaignService.getCampaignById(
        req.body.campaign_id
      );
      if (campaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Campaign Already Funded`
        );
        return Response.send(res);
      }
      if (campaign.budget === 0) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Insufficient Fund`
        );
        return Response.send(res);
      }
      const bodyAllowedList = new Set(['request_id', 'campaign_id', 'type']);
      for (let prop in req.body) {
        if (req.body.hasOwnProperty(prop) && !bodyAllowedList.has(prop)) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'unexpected parameter in POST body'
          );
          return Response.send(res);
        }
      }

      const request = await db.RequestFund.findOne({
        where: {
          id: req.body.request_id,
          campaign_id: req.body.campaign_id
        }
      });
      if (!request) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Request not found'
        );
        return Response.send(res);
      }
      await request.update({
        status: req.body.type === 'reject' ? 'Rejected' : 'Approved'
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        `Request ${req.body.type === 'reject' ? 'Rejected' : 'Approved'}`,
        request
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.: ${error}`
      );
      return Response.send(res);
    }
  }

  static async extendCampaign(req, res) {
    const {end_date, description, location, campaign_id, additional_budget} =
      req.body;
    const today = moment();
    const endDate = moment(end_date);
    try {
      const rules = {
        end_date: `required|date`,
        campaign_id: 'required|numeric',
        additional_budget: 'numeric'
      };

      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(400, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }

      if (today > endDate) {
        Response.setError(400, 'The end date must be after today');
        return Response.send(res);
      }

      const bodyAllowedList = new Set([
        'end_date',
        'description',
        'location',
        'campaign_id',
        'additional_budget'
      ]);
      for (let prop in req.body) {
        if (req.body.hasOwnProperty(prop) && !bodyAllowedList.has(prop)) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            'unexpected parameter in POST body'
          );
          return Response.send(res);
        }
      }
      if (req.campaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Campaign Already Funded`
        );
        return Response.send(res);
      }
      const dateB = moment(req.campaign.updatedAt);
      const dateC = moment(end_date);

      const extension_period = dateC.diff(dateB, 'days');

      req.campaign.budget = additional_budget
        ? Number(additional_budget) + req.campaign.budget
        : req.campaign.budget;
      req.body.status =
        req.campaign.type === 'cash-for-work' ? 'active' : 'ongoing';
      const newCampaign = await req.campaign.update(req.body);
      const history = await db.CampaignHistory.create({
        extension_period,
        new_end_date: end_date,
        additional_budget,
        campaign_id
      });
      newCampaign.dataValues.history = history;
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'campaign extended',
        newCampaign
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
  static async campaignHistory(req, res) {
    try {
      const campaign = await CampaignService.campaignHistory(req.campaign.id);
      for (let history of campaign.history) {
        const date = moment(campaign.end_date).isSame(
          history.new_end_date,
          'day'
        );
        if (date) {
          history.dataValues.currentCampaign = true;
        } else {
          history.dataValues.currentCampaign = false;
        }
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'campaign history retrieved',
        campaign
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.: ${error}`
      );
      return Response.send(res);
    }
  }
  static async UpdateCampaignProduct(req, res) {
    const {ProductId} = req.body;
    try {
      const iSProduct = await db.Product.findByPk(ProductId);
      if (!iSProduct) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          `Product with this ID  ${ProductId} Not Approved`
        );
        return Response.send(res);
      } else {
        await db.Product.update(
          {
            ...req.body
          },
          {
            where: {
              id: ProductId
            }
          }
        );
        Response.setSuccess(
          HttpStatusCode.STATUS_CREATED,
          'Product Updated in stores'
        );
        Response.send(res);
      }
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`
      );
      return Response.send(res);
    }
  }
  static async ProductVendors(req, res) {
    try {
      const productvendors = await db.VendorProduct.findAll();
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `Product's Vendors.`,
        productvendors
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.${error}`
      );
      return Response.send(res);
    }
  }
  static async getCampaignProducts(req, res) {
    try {
      const campaignId = req.params.campaign_id;
      const products = await ProductService.findCampaignProducts(campaignId);
      const campaign = await db.Campaign.findOne({where: {id: campaignId}});

      products.forEach(product => {
        product.dataValues.campaign_status = campaign.status;
        product.ProductVendors.forEach(vendor => {
          vendor.dataValues.VendorName =
            vendor.first_name + ' ' + vendor.last_name;
        });
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `Campaign Products.`,
        products
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.'
      );
      return Response.send(res);
    }
  }
  static async getProductVendors(req, res) {
    try {
      const VendorId = req.params.vendor_id;
      const vendor = await ProductService.ProductVendors(VendorId);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Beneficiaries',
        vendor
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async getCampaignBeneficiariesBalance(req, res) {
    try {
      let zeroTo9099 = 0,
        tenTo14999 = 0,
        twentyTo24999 = 0,
        twenty5To29999 = 0,
        fourtyTo44999 = 0,
        fourty5up = 0;
      const CampaignId = req.params.campaign_id;
      const wallet = await BeneficiaryService.getApprovedBeneficiaries(
        CampaignId
      );

      for (let user of wallet) {
        if (
          parseInt(user.User.Wallets[0].balance) >= 0 &&
          parseInt(user.User.Wallets[0].balance) <= 9099
        ) {
          zeroTo9099++;
        }
        if (
          parseInt(user.User.Wallets[0].balance) >= 10000 &&
          parseInt(user.User.Wallets[0].balance) <= 14999
        ) {
          tenTo14999++;
        }
        if (
          parseInt(user.User.Wallets[0].balance) >= 15000 &&
          parseInt(user.User.Wallets[0].balance) <= 19999
        ) {
          fifteenTo19999++;
        }
        if (
          parseInt(user.User.Wallets[0].balance) >= 20000 &&
          parseInt(user.User.Wallets[0].balance) <= 24999
        ) {
          twentyTo24999++;
        }
        if (
          parseInt(user.User.Wallets[0].balance) >= 25000 &&
          parseInt(user.User.Wallets[0].balance) <= 29999
        ) {
          twenty5To29999++;
        }
        if (
          parseInt(user.User.Wallets[0].balance) >= 30000 &&
          parseInt(user.User.Wallets[0].balance) <= 34999
        ) {
          thirtyTo3499++;
        }
        if (
          parseInt(user.User.Wallets[0].balance) >= 35000 &&
          parseInt(user.User.Wallets[0].balance) <= 39999
        ) {
          thirty5To3999++;
        }
        if (
          parseInt(user.User.Wallets[0].balance) >= 40000 &&
          parseInt(user.User.Wallets[0].balance) <= 44999
        ) {
          fourtyTo44999++;
        }
        if (parseInt(user.User.Wallets[0].balance) >= 45000) {
          fourty5up++;
        }
      }
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Beneficiaries', {
        zeroTo9099,
        tenTo14999,
        twentyTo24999,
        twenty5To29999,
        fourtyTo44999,
        fourty5up
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async getCampaignBeneficiaries(req, res) {
    try {
      const CampaignId = req.params.campaign_id;
      const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
        CampaignId
      );

      beneficiaries.forEach(beneficiary => {
        beneficiary.User.Answers.forEach(answer => {
          if (answer.campaignId == CampaignId) {
            beneficiary.dataValues.User.dataValues.Answers = [answer];
          }
        });
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Beneficiaries',
        beneficiaries
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.' + error
      );
      return Response.send(res);
    }
  }
  static async getVendorTransactionPerBene(req, res) {
    try {
      const CampaignId = req.params.campaign_id;
      //const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(CampaignId);
      const transactions =
        await BeneficiaryService.findVendorTransactionsPerBene(CampaignId);

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Beneficiaries',
        transactions
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async getCampaignBeneficiariesLocation(req, res) {
    try {
      let Lagos = 0,
        Abuja = 0,
        Kaduna = 0,
        Jos = 0;
      const CampaignId = req.params.campaign_id;
      const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
        CampaignId
      );
      for (let beneficiary of beneficiaries) {
        if (beneficiary.User.location.includes('state')) {
          let parsedJson = JSON.parse(beneficiary.User.location);
          if (parsedJson.state === 'Abuja') Abuja++;
          if (parsedJson.state === 'Lagos') Lagos++;
          if (parsedJson.state === 'Kaduna') Kaduna++;
          if (parsedJson.state === 'Jos') Jos++;
        }
      }
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Beneficiaries', {
        Abuja,
        Lagos,
        Kaduna,
        Jos
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async getCampaignBeneficiariesMStatus(req, res) {
    try {
      let married = 0;
      let single = 0;
      let divorce = 0;
      const CampaignId = req.params.campaign_id;
      const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
        CampaignId
      );
      if (beneficiaries.length > 0) {
        for (let i = 0; i < beneficiaries.length; i++) {
          if (beneficiaries[i].User.marital_status == 'single') {
            single++;
          } else if (beneficiaries[i].User.marital_status == 'married') {
            married++;
          } else if (beneficiaries[i].User.marital_status == 'divorce') {
            divorce++;
          }
        }
      }
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Beneficiaries', {
        single,
        married,
        divorce
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async getCampaignBeneficiariesAge(req, res) {
    try {
      let eighteenTo29 = 0;
      let thirtyTo41 = 0;
      let forty2To53 = 0;
      let fifty4To65 = 0;
      let sixty6Up = 0;
      const CampaignId = req.params.campaign_id;
      const beneficiaries = await BeneficiaryService.findCampaignBeneficiaries(
        CampaignId
      );

      for (let i = 0; i < beneficiaries.length; i++) {
        if (
          parseInt(
            moment().format('YYYY') -
              moment(beneficiaries[i].User.dob).format('YYYY')
          ) >= 18 &&
          parseInt(
            moment().format('YYYY') -
              moment(beneficiaries[i].User.dob).format('YYYY')
          ) <= 29
        ) {
          eighteenTo29++;
        }
        if (
          parseInt(
            moment().format('YYYY') -
              moment(beneficiaries[i].User.dob).format('YYYY')
          ) >= 30 &&
          parseInt(
            moment().format('YYYY') -
              moment(beneficiaries[i].User.dob).format('YYYY')
          ) <= 41
        ) {
          thirtyTo41++;
        }
        if (
          parseInt(
            moment().format('YYYY') -
              moment(beneficiaries[i].User.dob).format('YYYY')
          ) >= 42 &&
          parseInt(
            moment().format('YYYY') -
              moment(beneficiaries[i].User.dob).format('YYYY')
          ) <= 53
        ) {
          forty2To53++;
        }
        if (
          parseInt(
            moment().format('YYYY') -
              moment(beneficiaries[i].User.dob).format('YYYY')
          ) >= 54 &&
          parseInt(
            moment().format('YYYY') -
              moment(beneficiaries[i].User.dob).format('YYYY')
          ) <= 65
        ) {
          fifty4To65++;
        }
        if (
          parseInt(
            moment().format('YYYY') -
              moment(beneficiaries[i].User.dob).format('YYYY')
          ) >= 66
        ) {
          sixty6Up++;
        }
      }
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Beneficiaries', {
        eighteenTo29,
        thirtyTo41,
        forty2To53,
        fifty4To65,
        sixty6Up
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async updaeCampaignBeneficiary(req, res) {
    try {
      const campaign = req.campaign;

      const data = SanitizeObject(req.body, ['approved', 'rejected']);

      if (data.approved && !data.rejected) {
        data.rejected = false;
      }

      if (
        data.rejected &&
        (typeof data.approved == 'undefined' || !!data.approved)
      ) {
        data.approved = false;
      }

      if (campaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campagin Fund Already Disbursed.'
        );
        return Response.send(res);
      }
      const approval = await BeneficiaryService.updateCampaignBeneficiary(
        campaign.id,
        req.beneficiary_id,
        data
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Beneficiary Approval Updated!',
        approval
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

  static async getOrganisationBeneficiaries(req, res) {
    try {
      const organisation = req.organisation;
      const beneficiaries =
        await BeneficiaryService.findOrgnaisationBeneficiaries(
          organisation.id,
          req.query
        );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Organisation beneficiaries',
        beneficiaries
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

  static async getOrganisationBeneficiaryDetails(req, res) {
    try {
      const id = req.params.beneficiary_id;
      let total_wallet_spent = 0;
      let total_wallet_balance = 0;
      let total_wallet_received = 0;

      const [beneficiary, transaction] = await Promise.all([
        BeneficiaryService.organisationBeneficiaryDetails(
          id,
          req.organisation.id
        ),
        TransactionService.findTransactions({
          BeneficiaryId: id,
          is_approved: true
        })
      ]);
      console.log(beneficiary, 'opop');
      for (let tran of transaction) {
        if (
          tran.narration === 'Vendor Order' ||
          tran.transaction_type === 'withdrawal'
        ) {
          total_wallet_spent += tran.amount;
        }
        if (
          tran.BeneficiaryId == id &&
          tran.OrganisationId == req.organisation.id
        ) {
          total_wallet_received += tran.amount;
        }
      }
      for (let campaign of beneficiary.Campaigns) {
        for (let wallet of campaign.BeneficiariesWallets) {
          if (wallet.CampaignId && wallet.address) {
            const campaignWallet = await WalletService.findUserCampaignWallet(
              wallet.UserId,
              wallet.CampaignId
            );
            const token = await BlockchainService.allowance(
              campaignWallet.address,
              wallet.address
            );
            const balance = Number(token.Allowed.split(',').join(''));
            total_wallet_balance += balance;
          }
        }
      }
      beneficiary.dataValues.total_wallet_spent = total_wallet_spent;
      beneficiary.dataValues.total_wallet_balance = total_wallet_balance;
      beneficiary.dataValues.total_wallet_received = total_wallet_received;

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Beneficiary Details.',
        beneficiary
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Unexpected error occured.' + error
      );
      return Response.send(res);
    }
  }

  static async approvedAllbeneficiaries(req, res) {
    try {
      const campaign = req.campaign;
      const ids = req.body.ids;

      if (campaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign Fund Already Disbursed.'
        );
        return Response.send(res);
      }
      const [approvals] =
        await BeneficiaryService.approveAllCampaignBeneficiaries(
          campaign.id,
          ids
        );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiaries approved!', {
        approvals
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.' + error
      );
      return Response.send(res);
    }
  }
  static async rejectAllbeneficiaries(req, res) {
    try {
      const campaign = req.campaign;
      const ids = req.body.ids;

      if (campaign.is_funded) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign Fund Already Disbursed.'
        );
        return Response.send(res);
      }
      const [approvals] =
        await BeneficiaryService.rejectAllCampaignBeneficiaries(
          campaign.id,
          ids
        );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Beneficiaries rejected!', {
        approvals
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async approveCampaignVendor(req, res) {
    try {
      const approved = await CampaignService.approveVendorForCampaign(
        req.campaign.id,
        req.body.vendor_id
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Vendor approved.',
        approved
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

  static async removeCampaignVendor(req, res) {
    try {
      const removed = await CampaignService.removeVendorForCampaign(
        req.campaign.id,
        req.body.vendor_id
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Vendor removed.',
        removed
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

  static async getCampaignVendors(req, res) {
    try {
      Logger.info('Fetching campaign vendors...');
      const vendors = await CampaignService.campaignVendors(
        req.params.campaign_id
      );
      const setObj = new Set();
      const result = vendors.reduce((acc, item) => {
        if (!setObj.has(item.VendorId)) {
          setObj.add(item.VendorId, item);
          acc.push(item);
        }
        return acc;
      }, []);
      Logger.info('Fetched campaign vendors');
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Vendors.',
        result
      );
      return Response.send(res);
    } catch (error) {
      Logger.error('Error fetching campaign vendors');
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error occurred.'
      );
      return Response.send(res);
    }
  }

  static async updateProfile(req, res) {
    try {
      var form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        const rules = {
          organisation_id: 'required|numeric',
          first_name: 'required|alpha',
          last_name: 'required|alpha',
          email: 'required|email',
          phone: 'required|string',
          address: 'required|string',
          state: 'required|string',
          country: 'required|string',
          registration_id: 'required|string',
          year: 'required',
          website_url: 'url'
        };
        const validation = new Validator(fields, rules, {
          url: 'Only valid url with https or http allowed'
        });
        if (validation.fails()) {
          Response.setError(400, validation.errors);
          return Response.send(res);
        } else {
          const url_string = fields.website_url;
          const domain = extractDomain(url_string);
          const email = fields.email;
          const re = '(\\W|^)[\\w.\\-]{0,25}@' + domain + '(\\W|$)';
          if (!email.match(new RegExp(re))) {
            Response.setError(400, 'Email must end in @' + domain);
            return Response.send(res);
          }

          if (files.logo) {
            const allowed_types = ['image/jpeg', 'image/png', 'image/jpg'];
            if (!allowed_types.includes(files.logo.type)) {
              Response.setError(
                400,
                'Invalid File type. Only jpg, png and jpeg files allowed for Profile picture'
              );
              return Response.send(res);
            }
          }
          const organisation_exist = await db.Organisations.findOne({
            where: {
              email: fields.email
            }
          });
          if (
            !organisation_exist ||
            organisation_exist |
              (organisation_exist.id == fields.organisation_id)
          ) {
            if (!organisation_exist) {
              var org = await db.Organisations.findByPk(fields.organisation_id);
            } else {
              var org = organisation_exist;
            }
            org
              .update({
                email: fields.email,
                phone: fields.phone,
                address: fields.address,
                state: fields.state,
                country: fields.country,
                registration_id: fields.registration_id,
                year_of_inception: fields.year,
                website_url: fields.website_url
              })
              .then(async () => {
                if (files.logo) {
                  await uploadFile(
                    files.logo,
                    'ngo-l-' + org.id,
                    'convexity-ngo-logo'
                  ).then(url => {
                    org.update({
                      logo_link: url
                    });
                  });
                }
                await db.User.findByPk(req.user.id).then(user => {
                  user
                    .update({
                      first_name: fields.first_name,
                      last_name: fields.last_name
                    })
                    .then(() => {
                      Response.setSuccess(
                        201,
                        'NGO profile updated successfully',
                        {
                          org
                        }
                      );
                      return Response.send(res);
                    });
                });
              });
          } else {
            Response.setError(
              400,
              'Email has been taken by another organisation'
            );
            return Response.send(res);
          }
        }
      });
    } catch (error) {
      Response.setError(500, 'An error Occured');
      return Response.send(res);
    }
  }

  static async mintToken2(req, res) {
    const data = req.body;

    fs.writeFile('sample.txt', JSON.stringify(data), function (err) {
      if (err) {
        return res.json({
          status: 'Error'
        });
      }
      return res.json({
        status: 'DOne'
      });
    });
  }

  static async getFinancials(req, res) {
    try {
      const id = req.params.id;
      let ngo = await db.Organisations.findOne({
        where: {
          id
        },
        include: {
          model: db.Wallet,
          as: 'Wallet'
        }
      });
      const recieved = await db.Transaction.sum('amount', {
        where: {
          walletRecieverId: ngo.Wallet.uuid
        }
      });
      const sent = await db.Transaction.sum('amount', {
        where: {
          walletSenderId: ngo.Wallet.uuid
        }
      });
      Response.setSuccess(200, 'Organisation Financials Retrieved', {
        balance: ngo.Wallet.balance,
        recieved,
        disbursed: sent
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(200, 'Id is invalid');
      return Response.send(res);
    }
  }

  static async getMetric(req) {
    const id = req.params.id;
  }

  static async bantuTransfer(req, res) {
    const data = req.body;
    const rules = {
      organisation_id: 'required|numeric',
      xbnAmount: 'required|numeric'
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(400, validation.errors);
      return Response.send(res);
    } else {
      const organisation = await db.Organisations.findOne({
        where: {
          id: data.organisation_id
        },
        include: {
          model: db.Wallet,
          as: 'Wallet',
          where: {
            bantuAddress: {
              [Op.ne]: null
            }
          }
        }
      });

      if (organisation) {
        await BantuService.transferToken(
          organisation.Wallet[0].bantuPrivateKey,
          data.xbnAmount
        )
          .then(async response => {
            await organisation
              .createMintTransaction({
                amount: data.xbnAmount,
                transactionReference: response.hash,
                channel: 'bantu'
              })
              .then(fundTransaction => {
                const messageBody = {
                  id: organisation.id,
                  fund: fundTransaction.id,
                  address: organisation.Wallet[0].address,
                  walletId: organisation.Wallet[0].uuid,
                  amount: data.xbnAmount
                };
                mintTokenQueue.send(
                  new Message(messageBody, {
                    contentType: 'application/json'
                  })
                );
                Response.setSuccess(200, 'Token Minting Initiated');
                return Response.send(res);
              });
          })
          .catch(error => {
            Response.setError(400, error);
            return Response.send(res);
          });
      } else {
        Response.setError(400, 'Invalid Organisation / Campaign');
        return Response.send(res);
      }
    }
  }

  static async mintToken(req, res) {
    const data = req.body;
    const txRef = data.id;

    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    const response = await api.get(
      `https://api.flutterwave.com/v3/transactions/${txRef}/verify`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secretKey}`
        }
      }
    );

    const organisationId = response.data.data.meta.orgId;
    const amount = response.data.data.amount;

    const organisation = await db.Organisations.findOne({
      where: {
        id: organisationId
      },
      include: {
        model: db.Wallet,
        as: 'Wallet',
        where: {
          bantuAddress: {
            [Op.ne]: null
          }
        }
      }
    });

    const reference = await db.FundAccount.findOne({
      where: {
        transactionReference: txRef
      }
    });
    if (reference) {
      Response.setError(400, 'Transaction Reference already exist');
      return Response.send(res);
    }

    if (organisation) {
      await organisation
        .createMintTransaction({
          amount: amount,
          transactionReference: txRef,
          channel: 'bantu'
        })
        .then(fundTransaction => {
          const messageBody = {
            id: organisation.id,
            fund: fundTransaction.id,
            address: organisation.Wallet[0].address,
            walletId: organisation.Wallet[0].uuid,
            amount: amount
          };
          mintTokenQueue.send(
            new Message(messageBody, {
              contentType: 'application/json'
            })
          );
          Response.setSuccess(200, 'Mint Action Initiated');
          return Response.send(res);
        });
    } else {
      Response.setError(400, 'Invalid Organisation Id');
      return Response.send(res);
    }
  }

  static async getWallets(req, res) {
    try {
      const id = req.params.organisationId;
      const organisation = await db.Organisations.findOne({
        where: {
          id
        },
        include: {
          model: db.Wallet,
          as: 'Wallet',
          attributes: {
            exclude: ['bantuPrivateKey', 'privateKey']
          }
        }
      });
      Response.setSuccess(200, 'Organisation Wallet Retrieved', {
        wallets: organisation.Wallet
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(400, 'Invalid Organisation Id');
      return Response.send(res);
    }
  }

  static async getMainWallet(req, res) {
    try {
      const id = req.params.organisationId;
      console.log(id, 'id');
      const organisation = await db.Organisations.findOne({
        where: {
          id
        },
        include: {
          model: db.Wallet,
          as: 'Wallet',
          attributes: {
            exclude: ['bantuPrivateKey', 'privateKey']
          },
          where: {
            bantuAddress: {
              [Op.ne]: null
            }
          }
        }
      });
      Response.setSuccess(200, 'Organisation Wallet Retrieved', {
        wallet: organisation.Wallet[0]
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(400, 'Invalid Organisation Id');
      return Response.send(res);
    }
  }

  static async getCampignWallet(req, res) {
    try {
      const id = req.params.organisationId;
      const campaign = req.params.campaignId;
      const organisation = await db.Organisations.findOne({
        where: {
          id
        },
        include: {
          model: db.Wallet,
          as: 'Wallet',
          attributes: {
            exclude: ['bantuPrivateKey', 'privateKey']
          },
          where: {
            CampaignId: campaign
          }
        }
      });
      Response.setSuccess(200, 'Organisation Wallet Retrieved', {
        wallet: organisation.Wallet[0]
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(400, 'Invalid Organisation /Campaign Id');
      return Response.send(res);
    }
  }

  static async transferToken(req, res) {
    const data = req.body;
    const rules = {
      campaign: 'required|numeric',
      organisation_id: 'required|numeric',
      amount: 'required|numeric|min:100'
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      const organisation = await db.Organisations.findOne({
        where: {
          id: data.organisation_id
        },
        include: {
          model: db.Wallet,
          as: 'Wallet'
        }
      });

      if (!organisation) {
        Response.setError(400, 'Invalid Organisation Id');
        return Response.send(res);
      }

      const wallets = organisation.Wallet;
      let mainWallet;
      let reciepientWallet;
      let campaignExist = false;
      wallets.forEach(element => {
        if (element.CampaignId == data.campaign) {
          campaignExist = true;
          reciepientWallet = element;
        }
        if (element.bantuAddress) {
          mainWallet = element;
        }
      });

      if (!campaignExist) {
        Response.setError(
          400,
          'Organisation does not have a wallet attached to this campaign'
        );
        return Response.send(res);
      }

      const campaign = await db.Campaign.findByPk(data.campaign);

      if (mainWallet.balance < data.amount) {
        Response.setError(400, 'Main Wallet Balance has Insufficient Balance');
        return Response.send(res);
      } else {
        await organisation
          .createTransaction({
            walletSenderId: mainWallet.uuid,
            walletRecieverId: reciepientWallet.uuid,
            amount: data.amount,
            narration: 'Funding ' + campaign.title + ' campaign '
          })
          .then(transaction => {
            transferToQueue.send(
              new Message(
                {
                  senderAddress: mainWallet.address,
                  senderPass: mainWallet.privateKey,
                  reciepientAddress: reciepientWallet.address,
                  amount: data.amount,
                  transaction: transaction.uuid
                },
                {
                  contentType: 'application/json'
                }
              )
            );
          });
        Response.setSuccess(200, 'Transfer has been Initiated');
        return Response.send(res);
      }
    }
  }

  static async getBeneficiariesFinancials(req, res) {
    // try {
    const id = req.params.id;
    let ngo = await db.Organisations.findOne({
      where: {
        id
      },
      include: {
        model: db.OrganisationMembers,
        as: 'Member'
      }
    });
    if (ngo) {
      const members = ngo['Member'].map(element => {
        return element.id;
      });
      const campaigns = await db.Campaign.findAll({
        where: {
          OrganisationMemberId: {
            [Op.or]: members
          }
        },
        include: {
          model: db.Beneficiaries,
          as: 'Beneficiaries',
          include: {
            model: db.User,
            as: 'User',
            include: {
              model: db.Wallet,
              as: 'Wallet'
            }
          }
        }
      });
      const wallets = [];
      let remaining = 0;
      for (let camp of campaigns) {
        for (let beneficiary of camp.Beneficiaries) {
          let wallet = beneficiary.User.Wallet;
          if (!wallets.includes(wallet)) {
            wallets.push(wallet.uuid);
          }
          remaining = remaining + wallet.balance;
        }
      }
      const spent = await db.Transaction.sum('amount', {
        where: {
          walletSenderId: {
            [Op.or]: wallets
          }
        }
      });
      const recieved = await db.Transaction.sum('amount', {
        where: {
          walletRecieverId: {
            [Op.or]: wallets
          }
        }
      });
      Response.setSuccess(200, 'Beneficiaries', {
        spent,
        recieved,
        remaining
      });
      return Response.send(res);
    }
  }

  static async createVendor(req, res) {
    try {
      const {user, organisation} = req;
      const data = SanitizeObject(req.body, [
        'first_name',
        'last_name',
        'email',
        'phone',
        'address',
        'store_name',
        'location'
      ]);
      const vendor = await OrganisationService.createVendorAccount(
        organisation,
        data,
        user
      );
      Response.setSuccess(201, 'Vendor Account Created.', vendor);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }

  static async getOrganisationVendors(req, res) {
    try {
      const {organisation} = req;
      const vendors = (
        await VendorService.organisationVendors(organisation)
      ).map(res => {
        const toObject = res.toObject();
        toObject.Wallet.map(wallet => {
          delete wallet.privateKey;
          delete wallet.bantuPrivateKey;
          return wallet;
        });
        return toObject;
      });
      Response.setSuccess(200, 'Organisation vendors', vendors);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }

  static async getDonorVendors(req, res) {
    try {
      const {organisation} = req;
      const vendors = (
        await VendorService.organisationVendors(organisation, req.query)
      ).map(res => {
        const toObject = res.toObject();
        toObject.Wallet.map(wallet => {
          delete wallet.privateKey;
          delete wallet.bantuPrivateKey;
          return wallet;
        });
        return toObject;
      });
      Response.setSuccess(200, 'Organisation vendors', vendors);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }

  static async getVendorDetails(req, res) {
    try {
      const OrganisationId = req.organisation.id;
      const vendorId = req.params.vendor_id || req.body.vendor_id;
      const vendorProducts = await VendorService.vendorStoreProducts(vendorId);
      const vendor = await VendorService.vendorPublicDetails(vendorId, {
        OrganisationId
      });
      vendor.dataValues.Store = {
        Products: vendorProducts
      };
      vendor.dataValues.total_received = vendor.Wallets.map(wallet =>
        wallet.ReceivedTransactions.map(tx => tx.amount).reduce(
          (a, b) => a + b,
          0
        )
      ).reduce((a, b) => a + b, 0);
      vendor.dataValues.total_spent = vendor.Wallets.map(wallet =>
        wallet.SentTransactions.map(tx => tx.amount).reduce((a, b) => a + b, 0)
      ).reduce((a, b) => a + b, 0);
      Response.setSuccess(200, 'Organisation vendor', vendor);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }

  static async getVendorsSummary(req, res) {
    try {
      const organisation = req.organisation;
      const vendors_count = (
        await VendorService.organisationVendors(organisation, req.query)
      ).length;
      const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
      const previous_stat = await VendorService.organisationDailyVendorStat(
        organisation.id,
        yesterday
      );
      const today_stat = await VendorService.organisationDailyVendorStat(
        organisation.id
      );
      const Transactions = await VendorService.organisationVendorsTransactions(
        organisation.id
      );
      Response.setSuccess(200, 'Organisation vendors Summary', {
        organisation,
        vendors_count,
        previous_stat,
        today_stat,
        Transactions
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(500, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }

  static async matrix(req, res) {
    try {
      const matrics = {};
      const disbursedDates = [];
      const spendDate = [];
      const isOrgMember = await OrganisationService.isMemberUser(req.user.id);

      const isOrganisationCamp = await CampaignService.getAllCampaigns({
        OrganisationId: isOrgMember.OrganisationId,
        is_funded: true,
        ...req.query
      });
      const isOrganisationCampWallet =
        await WalletService.findOrganisationCampaignWallets(
          isOrgMember.OrganisationId
        );
      isOrganisationCamp.data.forEach(matric => {
        disbursedDates.push(matric.updatedAt);
      });
      isOrganisationCampWallet.forEach(spend => {
        spendDate.push(spend.updatedAt);
      });
      matrics.maxDisbursedDate = new Date(Math.max(...disbursedDates));
      matrics.minDisbursedDate = new Date(Math.min(...disbursedDates));
      matrics.maxSpendDate = new Date(Math.max(...spendDate));
      matrics.minSpendDate = new Date(Math.min(...spendDate));
      Response.setSuccess(200, `matrics received`, matrics);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, `Internal server error. Contact support.` + error);
      return Response.send(res);
    }
  }

  static async cash_item() {
    try {
    } catch (error) {}
  }
  static async record(req, res) {
    try {
      const isOrgMember = await OrganisationService.isMemberUser(req.user.id);
      const isOrganisationCamp = await CampaignService.getAllCampaigns({
        OrganisationId: isOrgMember.OrganisationId,
        is_funded: true,
        ...req.query
      });
      const isOrganisationCampWallet =
        await WalletService.findOrganisationCampaignWallets(
          isOrgMember.OrganisationId
        );
      function getDifference() {
        return isOrganisationCampWallet.filter(wallet => {
          return isOrganisationCamp.data.some(campaign => {
            return wallet.CampaignId === campaign.id;
          });
        });
      }

      const campaign_budget = isOrganisationCamp.data
        .map(val => val.budget)
        .reduce((accumulator, curValue) => accumulator + curValue, 0);
      const amount_disbursed = isOrganisationCamp.data
        .map(val => val.amount_disbursed)
        .reduce((accumulator, curValue) => accumulator + curValue, 0);
      const balance = getDifference()
        .map(val => val.balance)
        .reduce((accumulator, curValue) => accumulator + curValue, 0);
      const total_items_distributed = isOrganisationCamp.data
        .map(val => val.minting_limit)
        .reduce((accumulator, curValue) => accumulator + curValue, 0);
      Response.setSuccess(200, 'transaction', {
        campaign_budget,
        amount_disbursed,
        total_items_distributed,
        balance
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(500, `Internal server error. Contact support.`);
      return Response.send(res);
    }
  }

  static async non_ngo_beneficiaries(req, res) {
    try {
      const query = SanitizeObject(req.query);

      const org = await OrganisationService.isMemberUser(req.user.id);
      const nonOrgBeneficiaries = await BeneficiaryService.nonOrgBeneficiaries({
        ...query,
        OrganisationId: org.OrganisationId
      });
      Response.setSuccess(
        200,
        'this beneficiary not under your organisation',
        nonOrgBeneficiaries
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`
      );
      return Response.send(res);
    }
  }

  static async fundWithProvidus(req, res) {
    const {organisation_id} = req.params;
    try {
      const fundWithProvidus = await ProvidusService.fundWithProvidus(
        organisation_id
      );
      Response.setSuccess(200, 'fund with providus', fundWithProvidus);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`
      );
      return Response.send(res);
    }
  }
  static async createTicket(req, res) {
    const data = req.body;
    try {
      const rules = {
        email: 'required|email',
        subject: 'required|string',
        description: 'required|string',
        'contact.email': 'email',
        'contact.firstName': 'string',
        'contact.lastName': 'string'
      };
      console.log(data, 'data');

      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      data.departmentId = '661286000000006907';
      // const createdTicket = await ZohoService.createTicket(data);
      const generate = await ZohoService.generatingToken();
      Response.setSuccess(201, 'Ticket Created Successfully', generate);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`
      );
      return Response.send(res);
    }
  }

  static async createTicketOrg(req, res) {
    const data = req.body;
    try {
      const rules = {
        subject: 'required|string',
        description: 'required|string'
      };

      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      const member = await OrganisationService.isMemberUser(req.user.id);
      const organisation = await OrganisationService.findOneById(
        member.OrganisationId
      );

      const org = organisation.Organisations[0];
      data.departmentId = '661286000000006907';
      data.email = org.email;
      data.contact = {
        firstName: organisation.first_name,
        lastName: organisation.first_name,
        phone: org.phone,
        email: org.email
      };

      const createdTicket = await ZohoService.createTicket(data);
      Response.setSuccess(201, 'Ticket Created Successfully', createdTicket);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`
      );
      return Response.send(res);
    }
  }

  static async fetchToken(req, res) {
    try {
      const token = await ZohoService.fetchToken();
      Response.setSuccess(201, 'Ticket Created Successfully', token);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`
      );
      return Response.send(res);
    }
  }
  static async destroyToken(req, res) {
    try {
      const token = await ZohoService.destroy(req.query.id);
      Response.setSuccess(201, 'success', token);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`
      );
      return Response.send(res);
    }
  }
  static async saveToken(req, res) {
    try {
      const token = await ZohoService.saveToken(req.body);
      Response.setSuccess(201, 'success', token);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        500,
        `Internal server error. Contact support. ${error}`
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

module.exports = OrganisationController;
