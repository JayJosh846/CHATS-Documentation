const {FundAccount, Wallet} = require('../models');
const QueueService = require('./QueueService');
const {Logger} = require('../libs');
const BlockchainService = require('./BlockchainService');
class WebhookService {
  static async verifyPaystackDeposit(data) {
    if (data.event == 'charge.success') {
      const transactionReference = data.data.reference;
      const record = await FundAccount.findOne({
        where: {
          transactionReference
        }
      });
      if (record) {
        await record.update({
          approved: true
        });
        record.dataValues.approved = true;
        QueueService.verifyFiatDeposit(record);
        return record;
      }
      return null;
    }
    return null;
  }

  static async verifyPaystackCampaignDeposit(data) {
    if (data.event == 'charge.success') {
      const transactionReference = data.data.reference;
      const record = await FundAccount.findOne({
        where: {
          transactionReference
        }
      });

      if (record) {
        await record.update({
          approved: true
        });
        record.dataValues.approved = true;
        QueueService.verifyFiatDeposit(record);
        const isCampaign = await Wallet.findOne({
          where: {CampaignId: data.campaign_id}
        });
        const isOrganisation = await Wallet.findOne({
          where: {OrganisationId: record.OrganisationId}
        });
        if (isOrganisation && isCampaign) {
          QueueService.createCampaignPayStack(
            data.campaign_id,
            isCampaign.uuid,
            isOrganisation.uuid,
            record.OrganisationId,
            record.amount
          );
        }
        return record;
      }
      return null;
    }
    return null;
  }
}

module.exports = WebhookService;
