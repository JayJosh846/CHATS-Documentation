const {
  Sequelize,
  Transaction,
  Wallet,
  VoucherToken,
  Campaign,
  TaskAssignment,
  ProductBeneficiary,
  Order
} = require('../models');

class ConsumerFunction {
  static async update_transaction(args, uuid) {
    const transaction = await Transaction.findOne({where: {uuid}});
    if (!transaction) return null;
    await transaction.update(args);
    return transaction;
  }
  static async update_campaign(id, args) {
    const campaign = await Campaign.findOne({where: {id}});
    if (!campaign) return null;
    await campaign.update(args);
    return campaign;
  }
  static async update_order(reference, args) {
    const order = await Order.findOne({where: {reference}});
    if (!order) return null;
    await order.update(args);
    return order;
  }

  static async addWalletAmount(amount, uuid) {
    const wallet = await Wallet.findOne({where: {uuid}});
    if (!wallet) return null;
    await wallet.update({
      balance: Sequelize.literal(`balance + ${amount}`),
      fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`)
    });
    Logger.info(`Wallet amount added with ${amount}`);
    return wallet;
  }
}

module.exports = ConsumerFunction;
