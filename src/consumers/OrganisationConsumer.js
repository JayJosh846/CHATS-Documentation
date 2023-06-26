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
const {RabbitMq, Logger} = require('../libs');
const {
  WITHHELD_FUND,
  CONFIRM_WITHHOLDING_FUND,
  WITHHOLD_FUND_GAS_ERROR
} = require('../constants/queues.constant');
const {
  BlockchainService,
  QueueService,
  WalletService,
  TransactionService
} = require('../services');

//Donor/NGO to withheld fund if don't want to donate again
const withHoldFund = RabbitMq['default'].declareQueue(WITHHELD_FUND, {
  durable: true,
  prefetch: 1
});

//Confirm Donor/NGO to withheld fund if don't want to donate again
const confirmHoldFund = RabbitMq['default'].declareQueue(
  CONFIRM_WITHHOLDING_FUND,
  {
    durable: true,
    prefetch: 1
  }
);
//Increase Gas for Donor/NGO to withheld fund if don't want to donate again
const increaseGasHoldFund = RabbitMq['default'].declareQueue(
  WITHHOLD_FUND_GAS_ERROR,
  {
    durable: true,
    prefetch: 1
  }
);

//#################UPDATES FUNCTIONS######################

const update_transaction = async (args, uuid) => {
  console.log(args, uuid, 'args, uuid');
  const transaction = await TransactionService.findTransaction({uuid});
  console.log(transaction, 'transaction');
  if (!transaction) return null;
  await transaction.update(args);
  return transaction;
};

const addWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    balance: Sequelize.literal(`balance + ${amount}`),
    fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`)
  });
  Logger.info(`Wallet amount added with ${amount}`);
  return wallet;
};

const deductWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    balance: Sequelize.literal(`balance - ${amount}`),
    fiat_balance: Sequelize.literal(`fiat_balance - ${amount}`)
  });
  Logger.info(`Wallet amount deducted with ${amount}`);
  return wallet;
};
//Consumers
RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    //consumer for withholding funds
    withHoldFund
      .activateConsumer(async msg => {
        const {
          campaign_id,
          organisation_id,
          transactionId,
          amount
        } = msg.getContent();
        const [organizationKeys, campaignKeys] = await Promise.all([
          BlockchainService.setUserKeypair(`organisation_${organisation_id}`),
          BlockchainService.setUserKeypair(`campaign_${campaign_id}`)
        ]);
        Logger.info('Process 1');
        const stringBalance = amount.toString();
        const transfer = await BlockchainService.transferTo(
          campaignKeys.privateKey,
          organizationKeys.address,
          amount,
          {
            transactionId,
            campaign_id,
            organisation_id,
            stringBalance
          },
          'withHoldFunds'
        );

        Logger.info('Process 2');
        if (!transfer) {
          msg.nack();
          return;
        }
        Logger.info('Process 3');

        await update_transaction(
          {
            transaction_hash: transfer.Transfered
          },
          transactionId
        );
        Logger.info('transaction_hash: ');
        await QueueService.confirmWithHoldFunds({
          transactionId,
          transaction_hash: transfer.Transfered,
          campaign_id,
          organisation_id,
          amount
        });
        Logger.info('Transfered to NGO');
      })
      .then(() => {
        Logger.info('Running consumer for withholding funds');
      })
      .catch(error => {
        Logger.error(`Error withholding funds: ${error}`);
      });

    //confirm if transaction has been mined on the blockchain
    confirmHoldFund
      .activateConsumer(async msg => {
        const {
          transactionId,
          transaction_hash,
          campaign_id,
          organisation_id,
          amount
        } = msg.getContent();
        Logger.info('Confirming Withdraw fund');
        const confirmed = await BlockchainService.confirmTransaction(
          transaction_hash
        );

        if (!confirmed) {
          msg.nack();
          return;
        }
        await update_campaign(campaign_id, {
          is_funded: false,
          is_processing: false,
          amount_disburse: 0
        });
        await update_transaction(
          {
            status: 'success',
            is_approved: true
          },
          transactionId
        );
        const organisationW = WalletService.findMainOrganisationWallet(
          organisation_id
        );
        const campaignW = WalletService.findSingleWallet({
          CampaignId: campaign_id,
          OrganisationId: organisation_id
        });

        await addWalletAmount(amount, organisationW.uuid);
        await deductWalletAmount(amount, campaignW.uuid);
        Logger.info('Confirmed Withdraw fund');
      })
      .then(() => {
        Logger.info('Running consumer for confirming withholding funds');
      })
      .catch(error => {
        Logger.error(`Error confirming withholding funds: ${error}`);
      });
    // Increase gas if finished while withholding funds
    increaseGasHoldFund
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();

        const gasFee = await BlockchainService.reRunContract(
          'token',
          'transfer',
          {
            ...keys,
            amount: keys.amount.toString()
          }
        );

        if (!gasFee) {
          msg.nack();
          return;
        }
        await update_transaction(
          {
            transaction_hash: gasFee.retried
          },
          message.transactionId
        );
        await QueueService.confirmWithHoldFunds({
          ...message,
          transaction_hash: gasFee.retried
        });
      })
      .then(() => {
        Logger.info(
          'Running consumer for increasing gas for withholding funds'
        );
      })
      .catch(error => {
        Logger.error(`Error increasing gas for withholding funds: ${error}`);
      });
  })
  .then(() => {
    Logger.info(`Organization consumer running`);
  })
  .catch(error => {
    Logger.error(`Organization consumer error: ${error}`);
  });
