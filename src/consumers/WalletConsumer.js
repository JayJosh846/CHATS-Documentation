const {BlockchainService, WalletService, QueueService} = require('../services');
const {RabbitMq, Logger} = require('../libs');
const {
  CREATE_WALLET,
  CONFIRM_AND_CREATE_WALLET
} = require('../constants').queuesConst;

const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true,
  prefetch: 1
});

const confirmAndCreateWalletQueue = RabbitMq['default'].declareQueue(
  CONFIRM_AND_CREATE_WALLET,
  {
    durable: true,
    prefetch: 1
  }
);

RabbitMq['default']
  .completeConfiguration()
  .then(() => {
    createWalletQueue
      .activateConsumer(async msg => {
        const content = msg.getContent();
        const token = await BlockchainService.addUser(
          `${
            !content.CampaignId && content.wallet_type == 'user'
              ? 'user_' + content.ownerId
              : content.CampaignId && content.wallet_type == 'user'
              ? `user_${content.ownerId}campaign_${content.CampaignId}`
              : !content.CampaignId && content.wallet_type == 'organisation'
              ? 'organisation_' + content.ownerId
              : content.CampaignId &&
                content.wallet_type == 'organisation' &&
                'campaign_' + content.CampaignId
          }`,
          CREATE_WALLET,
          content
        );

        if (!token) {
          msg.nack();
          return;
        }

        await QueueService.confirmAndCreateWallet(content, token);
        Logger.info('Address Sent for confirmation');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`Consumer Error: ${error.message}`);
      })
      .then(() => {
        Logger.info(`Running Process For Wallet Creation`);
      });

    confirmAndCreateWalletQueue
      .activateConsumer(async msg => {
        const {content, keyPair} = msg.getContent();
        // let confirm;
        // setTimeout(async () => {
        //   confirm = await BlockchainService.confirmTransaction(
        //     hash.data.AddedUser,
        //     CONFIRM_AND_CREATE_WALLET,
        //     content
        //   );
        // }, RERUN_QUEUE_AFTER);

        // if (!confirm) {
        //   msg.nack();
        //   return;
        // }

        await WalletService.updateOrCreate(content, {
          address: keyPair.address
        });
        Logger.info('Account Wallet Created');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`Consumer Error: ${error.message}`);
      })
      .then(() => {
        Logger.info(`Running Process For Confirming Wallet Creation`);
      });
  })
  .catch(error => {
    Logger.error(`RabbitMq Error: ${error}`);
  });
