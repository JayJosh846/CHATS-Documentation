const {
  PaystackService,
  DepositService,
  WalletService,
  QueueService,
  TransactionService,
  OrderService,
  BlockchainService,
  CampaignService,
  CurrencyServices
} = require('../services');
const {Logger, Response} = require('../libs');
const {HttpStatusCode, SanitizeObject} = require('../utils');
const {Op} = require('sequelize');
const {logger} = require('../libs/Logger');

class WalletController {
  static async getOrgnaisationTransaction(req, res) {
    try {
      const OrganisationId = req.params.organisation_id;
      const reference = req.params.reference;
      if (!reference) {
        const transactions =
          await TransactionService.findOrgnaisationTransactions(
            OrganisationId,
            req.query
          );
        for (let tran of transactions.data) {
          if (tran.CampaignId) {
            const hash = await BlockchainService.getTransactionDetails(
              tran.transaction_hash
            );
            const campaign = await CampaignService.getCampaignById(
              tran.CampaignId
            );
            tran.dataValues.transaction_hash = hash;
            tran.dataValues.campaign_name = campaign.title;
            tran.dataValues.funded_with = null;
          }
        }

        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Organisation Transactions',
          transactions
        );
        return Response.send(res);
      }

      const transactions = await TransactionService.findTransaction({
        OrganisationId,
        reference
      });
      if (!transactions) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Transaction not found.'
        );
        return Response.send(res);
      }

      for (let transaction of transactions) {
        if (typeof transaction.CampaignId === 'number') {
          const campaign = await CampaignService.getACampaign(
            transaction.CampaignId,
            req.organisation.id
          );
          transaction.dataValues.campaign_name = campaign.title;
        }
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Transaction Details',
        transactions
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Unexpected error occured.'
      );
      return Response.send(res);
    }
  }
  static async getOrganisationWallet(req, res) {
    try {
      const user = await BlockchainService.setUserKeypair(
        `organisation_${req.organisation.id}`
      );
      const token = await BlockchainService.balance(user.address);
      const balance = Number(token.Balance.split(',').join(''));
      const OrganisationId = req.organisation.id;
      let usersCurrency = req.user.currency;
      let exchangeRate = 0.0;
      let currencyData = {};
      const uuid = req.params.wallet_id;
      if (uuid) {
        return WalletController._handleSingleWallet(res, {
          OrganisationId,
          uuid
        });
      }

      let [{total: total_deposit}] =
        await TransactionService.getTotalTransactionAmount({
          OrganisationId,
          status: 'success',
          is_approved: true,
          transaction_type: 'deposit'
        });

      let [{total: spend_for_campaign}] =
        await TransactionService.getTotalTransactionAmount({
          OrganisationId,
          is_approved: true,
          status: 'success',
          transaction_type: 'transfer',
          CampaignId: {
            [Op.not]: null
          }
        });

      const currencyObj = CurrencyServices;
      //convert currency to set currency if not in USD
      //get users set currency
      if (
        usersCurrency === '' ||
        usersCurrency == null ||
        usersCurrency === 'USD'
      ) {
        usersCurrency = 'USD';
        //  console.log(usersCurrency);
        exchangeRate = await currencyObj.convertCurrency(
          usersCurrency,
          'USD',
          1
        );
      } else if (usersCurrency !== 'USD') {
        //  console.log(usersCurrency);
        exchangeRate = await currencyObj.convertCurrency(
          'USD',
          usersCurrency,
          1
        );
      }

      console.log('ExchangeRate: ' + exchangeRate);
      //set the users currency
      currencyData = {
        users_currency: usersCurrency,
        currency_symbol: '$'
      };

      const wallet = await WalletService.findMainOrganisationWallet(
        OrganisationId
      );
      if (!wallet) {
        await QueueService.createWallet(OrganisationId, 'organisation');
      }
      if (wallet) {
        const MainWallet = wallet.toObject();
        total_deposit = (total_deposit * exchangeRate).toFixed(2) || 0;
        spend_for_campaign =
          (spend_for_campaign * exchangeRate).toFixed(2) || 0;
        MainWallet.balance = (balance * exchangeRate).toFixed(2);
        MainWallet.fiat_balance = (balance * exchangeRate).toFixed(2);
        MainWallet.address = user.address;
        /*  
        total_deposit = total_deposit || 0;
        spend_for_campaign = spend_for_campaign || 0;
        MainWallet.balance = balance;
        MainWallet.fiat_balance = balance;
        MainWallet.address = user.address;
  */
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Main wallet deatils', {
          MainWallet,
          total_deposit,
          spend_for_campaign,
          currencyData
        });
        return Response.send(res);
      } else {
        console.error('wallet not found');
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Wallet Not Found'
        );
        return Response.send(res);
      }
    } catch (error) {
      console.error(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Unexpected error occured.'
      );
      return Response.send(res);
    }
  }

  static async getOrganisationCampaignWallet(req, res) {
    try {
      const CampaignId = req.params.campaign_id;
      const OrganisationId = req.organisation.id;

      if (CampaignId) {
        const wallet = await WalletService.findCampaignFundWallet(
          OrganisationId,
          CampaignId
        );
        if (!wallet) {
          Response.setError(
            HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
            'Campaign wallet not found.'
          );
        } else {
          Response.setSuccess(
            HttpStatusCode.STATUS_OK,
            'Campaign Wallet',
            wallet.toObject()
          );
        }
        return Response.send(res);
      }

      const wallets = await WalletService.findOrganisationCampaignWallets(
        OrganisationId
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign wallets',
        wallets
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Unexpected error occured.'
      );
      return Response.send(res);
    }
  }

  static async paystackDeposit(req, res) {
    try {
      const data = SanitizeObject(req.body, ['amount', 'currency']);
      const {organisation_id} = req.params;
      if (!data.currency) data.currency = 'NGN';
      const CampaignId = req.body.CampaignId ? req.body.CampaignId : null;
      const organisation = req.organisation;
      organisation.dataValues.email = req.user.email;
      const wallet = await WalletService.findMainOrganisationWallet(
        organisation_id
      );
      if (!wallet) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Oganisation wallet not found.'
        );
      }
      logger.info(`Initiating PayStack Transaction`);
      const response = await PaystackService.buildDepositData(
        organisation,
        data.amount,
        CampaignId,
        data.currency
      );
      logger.info(`Initiated PayStack Transaction`);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Deposit data generated.',
        response
      );
      return Response.send(res);
    } catch (error) {
      logger.error(`Error Initiating PayStack Transaction: ${error}`);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Request failed. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async depositRecords(req, res) {
    try {
      const OrganisationId = req.organisation.id;
      const filter = SanitizeObject(req.query, [
        'channel',
        'service',
        'status',
        'approved'
      ]);
      const records = await DepositService.findOrgDeposits(
        OrganisationId,
        filter
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Deposit history.',
        records
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Request failed.'
      );
      return Response.send(res);
    }
  }

  static async depositByReference(req, res) {
    try {
      const OrganisationId = req.organisation.id;
      const reference = req.params.reference;
      const record = await DepositService.findOrgDepositByRef(
        OrganisationId,
        reference
      );
      !record &&
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Deposit record not found.'
        );
      !!record &&
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Deposit record found.',
          record
        );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Request failed.'
      );
      return Response.send(res);
    }
  }

  static async CampaignBalance(req, res) {
    const {campaign_id, organisation_id} = req.params;
    console.log(campaign_id, organisation_id, 'campaign_id, organisation_id');
    try {
      const campaign = await CampaignService.getCampaignWallet(
        campaign_id,
        organisation_id
      );
      if (campaign) {
        //const balance = campaign.Wallet.balance
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Balance Retrieved .',
          campaign
        );
        return Response.send(res);
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `No Campaign with ID: ${campaign_id}`
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Request failed.' + error
      );
      return Response.send(res);
    }
  }

  static async CampaignBalance(req, res) {
    const {campaign_id, organisation_id} = req.params;

    try {
      const campaign = await WalletService.findUserWallets(
        campaign_id,
        organisation_id
      );
      if (campaign) {
        const balance = campaign.Wallet.balance;
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Balance Retrieved .',
          balance
        );
        return Response.send(res);
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `No Campaign with ID: ${campaign_id}`
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error: Request failed.' + error
      );
      return Response.send(res);
    }
  }

  static async _handleSingleWallet(res, query) {
    const wallet = await WalletService.findSingleWallet(query);
    if (!wallet) {
      Response.setError(
        HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
        'Wallet not found'
      );
    } else {
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Wallet details',
        wallet.toObject()
      );
    }
    return Response.send(res);
  }
}

module.exports = WalletController;
