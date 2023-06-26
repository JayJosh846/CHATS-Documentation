const fetch = require('node-fetch');
const StellarSdk = require('stellar-sdk');
const {
  baseURL,
  adminAddress,
  adminSecret,
  networkPassphrase,
} = require('../config').bantuConfig;

const server = new StellarSdk.Server(baseURL, {
  allowHttp: true,
});

class BantuService {
  static createPair() {
    const pair = StellarSdk.Keypair.random();
    const bantuPrivateKey = pair.secret();
    const bantuAddress = pair.publicKey();
    this.creditWallet(bantuAddress);
    return {
      bantuPrivateKey,
      bantuAddress,
    };
  }

  static async creditWallet(publicKey) {
    try {
      await fetch(
        `https://friendbot.dev.bantu.network?addr=${encodeURIComponent(
          publicKey,
        )}`,
      );
    } catch (e) {
      console.error('ERROR!', e);
    }
  }

  static async getXbnBalance(publicKey) {
    return new Promise(async (resolve, reject) => {
      let xbnBalance = 0;
      return await server
        .loadAccount(publicKey)
        .then(account => {
          account.balances.forEach(function (balance) {
            if (balance.asset_type == 'native') {
              xbnBalance = balance.balance;
              return;
            }
          });
          resolve(xbnBalance);
        })
        .catch(error => {
          reject(error.message);
        });
    });
  }

  static async transferToken(senderSecret, amount) {
    return new Promise((resolve, reject) => {
      var sourceKeys = StellarSdk.Keypair.fromSecret(senderSecret);
      var destinationId = adminAddress;
      var transaction;
      server
        .loadAccount(destinationId)
        .then(async function () {
          return server.loadAccount(sourceKeys.publicKey());
        })
        .then(function (sourceAccount) {
          transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: networkPassphrase,
          })
            .addOperation(
              StellarSdk.Operation.payment({
                destination: destinationId,
                asset: StellarSdk.Asset.native(),
                amount: String(amount),
              }),
            )
            .addMemo(StellarSdk.Memo.text('Test Transaction'))
            .setTimeout(180)
            .build();
          transaction.sign(sourceKeys);
          return server.submitTransaction(transaction);
        })
        .then(function (result) {
          resolve(result);
        })
        .catch(function (error) {
          if (error instanceof StellarSdk.NotFoundError) {
            return reject('The destination account does not exist!');
          } else {
            return reject(error);
          }
        });
    });
  }
}

module.exports = BantuService;
