const db = require('../models');

class Transfer {
  /**
   * @param {number} userId
   * @param {string} recipientsId
   * @param {number} amount
   * @param {strig} transactionType
   */
  processTransfer(senderId, recipientsId, amount, transactionType = 'CR') {
    return new Promise((resolve, reject) => {
      this.usersBalance(recipientsId)
        .then(oldBalance => {
          //get balance
          // const newBalance = (oldBalance + amount);
          // this.updateBalance(recipientsId, newBalance);
          if (transactionType === 'CR') {
            //if crediting wallet
            return this.creditTransactions(
              senderId,
              recipientsId,
              amount,
              oldBalance,
            );
          } else if (transactionType === 'DR') {
            if (oldBalance >= amount) {
              return this.debitTransactions(
                senderId,
                recipientsId,
                amount,
                oldBalance,
              );
            } else {
              throw 'Insufficients Balance';
            }
          }
        })
        .catch(err => reject(false));
    });
  }

  /**
   *
   * @param {string} userId user id
   * @param {float} amount new users balance to update
   */
  updateBalance(userId, amount) {
    return new Promise((resolve, reject) => {
      db.User.update({balance: amount}, {where: {id: userId}})
        .then(user => {
          console.log(user);
          resolve(user);
        })
        .catch(err => {
          reject(err);
        });

      // if (db.User.update({ balance: amount }, { where: { id: userId } }))
      //     resolve(true);
      // else
      //     reject(false);
    });
  }
  /**
   *
   * @param {string} userId
   * @param {string} amount
   * @param {string} narration
   */
  debitTransactions(
    userId,
    recipientsId,
    amount,
    oldBalance,
    narration = '',
    log = '',
  ) {
    return new Promise((resolve, reject) => {
      db.Transaction.create({
        amount: amount,
        UserId: userId, // sender
        recipientsId: recipientsId,
        status: 1,
        type: 'DR',
        narration: 'Debiting Wallet with ' + amount + ' ' + narration,
        log: log,
      })
        .then(transaction => {
          this.updateBalance(userId, oldBalance - amount)
            .then(res => {
              resolve(transaction);
            })
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }
  /**
   *
   * @param {string} userId
   * @param {string} recipientsId
   * @param {number} amount
   * @param {number} oldBalance
   * @param {string} narration
   * @returns {object} Promises
   */
  creditTransactions(
    userId,
    recipientsId,
    amount,
    oldBalance,
    narration = '',
    log = '',
  ) {
    return new Promise((resolve, reject) => {
      db.Transaction.create({
        amount: amount,
        UserId: userId, // sender
        recipientsId: recipientsId,
        status: 1,
        type: 'CR',
        narration: 'Crediting Wallet with ' + amount + ' ' + narration,
        log: log,
      })
        .then(transaction => {
          // console.log(transaction);
          // console.log("===========================Credited===========================");
          // const updated = await this.updateBalance(userId, amount + oldBalance);
          // console.log(updated);
          this.updateBalance(recipientsId, amount + oldBalance)
            .then(res => {
              // console.log(res);
              resolve(transaction);
            })
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }
  /**
   * Return  Users balance
   * @returns balance
   * @param {string} userId
   */
  usersBalance(userId) {
    return new Promise((resolve, reject) => {
      db.User.findOne({where: {id: userId}})
        .then(user => {
          resolve(user.balance);
        })
        .catch(err => {
          reject(err);
        });
    });
  }
}

module.exports = new Transfer();
