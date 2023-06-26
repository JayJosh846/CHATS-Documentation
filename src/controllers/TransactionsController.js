const TransactionService = require('../services/TransactionService');
const util = require('../libs/Utils');
const {HttpStatusCode} = require('../utils');
const {Response} = require('../libs');
const BeneficiariesService = require('../services/BeneficiaryService');
const {UserService, BlockchainService} = require('../services');

class TransactionsController {
  static async vendorTransaction(req, res) {
    try {
      const transactions = await TransactionService.getVendorTransaction(
        req.params.vendor_id
      );
      for (let transaction of transactions) {
        const beneficiary = await UserService.findBeneficiary(
          transaction.BeneficiaryId
        );
        transaction.dataValues.beneficiary = beneficiary;
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        `vendor transactions retrieved`,
        transactions
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support. ${error}`
      );
      return Response.send(res);
    }
  }
  static async getAllTransactions(req, res) {
    try {
      const allTransaction = await TransactionService.getAllTransactions();
      if (allTransaction.length > 0) {
        util.setSuccess(200, 'Transaction retrieved', allTransaction);
      } else {
        util.setSuccess(200, 'No Transaction found');
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }

  static async addTransaction(req, res) {
    if (!req.body.amount || !req.body.recipientsId) {
      util.setError(400, 'Please provide complete details');
      return util.send(res);
    }
    const newTransaction = req.body;
    try {
      const createdTransaction = await TransactionService.addTransaction(
        newTransaction
      );
      util.setSuccess(201, 'Transaction Added!', createdTransaction);
      return util.send(res);
    } catch (error) {
      util.setError(500, error.message);
      return util.send(res);
    }
  }
  /**
   * Generating an invoice to be paid by another person
   * @param {req} object The request heaer of the payload
   * @param {res} object The response to be sent back to the requestor
   * @returns
   */
  static async newInvoice(req, res) {
    try {
    } catch (error) {}
  }

  static async updatedTransaction(req, res) {
    const alteredTransaction = req.body;
    const {id} = req.params;
    if (!Number(id)) {
      util.setError(400, 'Please input a valid numeric value');
      return util.send(res);
    }
    try {
      const updateTransaction = await TransactionService.updateTransaction(
        id,
        alteredTransaction
      );
      if (!updateTransaction) {
        util.setError(404, `Cannot find Transaction with the id: ${id}`);
      } else {
        util.setSuccess(200, 'Transaction updated', updateTransaction);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }

  static async updateTransaction(req, res) {
    const alteredTransaction = req.body;
    const {id} = req.params;
    if (!Number(id)) {
      util.setError(400, 'Please input a valid numeric value');
      return util.send(res);
    }
    try {
      const updateTransaction = await TransactionService.updateTransaction(
        id,
        alteredTransaction
      );
      if (!updateTransaction) {
        util.setError(404, `Cannot find Transaction with the id: ${id}`);
      } else {
        util.setSuccess(200, 'Transaction updated', updateTransaction);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }

  static async getATransaction(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      util.setError(400, 'Please input a valid numeric value');
      return util.send(res);
    }

    try {
      const theTransaction = await TransactionService.getATransaction(id);

      if (!theTransaction) {
        util.setError(404, `Cannot find Transaction with the id ${id}`);
      } else {
        util.setSuccess(200, 'Found Transaction', theTransaction);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }

  static async getUserATransaction(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      util.setError(400, 'Please input a valid numeric value');
      return util.send(res);
    }
    try {
      const theTransaction = await TransactionService.getUserATransaction(id);

      if (!theTransaction) {
        util.setError(404, `Cannot find User with the id ${id}`);
      } else {
        util.setSuccess(200, 'Found Transaction', theTransaction);
      }
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }

  static async deleteTransaction(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      util.setError(400, 'Please provide a numeric value');
      return util.send(res);
    }

    try {
      const TransactionToDelete = await TransactionService.deleteTransaction(
        id
      );

      if (TransactionToDelete) {
        util.setSuccess(200, 'Transaction deleted');
      } else {
        util.setError(404, `Transaction with the id ${id} cannot be found`);
      }
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }
  static async confirmOtp(req, res) {
    try {
      const code = req.body.code;
      util.setSuccess(200, 'Code Confirmed', code);
      return util.send(res);
    } catch (error) {
      util.setError(404, error);
      return util.send(res);
    }
  }
  static async getBlockChainTransactionDetails(req, res) {
    const trans_hash = req.params.transaction_hash;
    try {
      // console.log(`Transaction Hash: ${trans_hash}`);
      let blockChains = await BlockchainService.getTransactionDetails(
        trans_hash
      );
      if (!blockChains) {
        util.setSuccess(200, 'Transaction yet to be Mined ', blockChains);
        return util.send(res);
      }

      util.setSuccess(200, 'Transaction Details Retrieved', blockChains);
      return util.send(res);
    } catch (error) {
      util.setError(400, error);
      return util.send(res);
    }
  }
}

module.exports = TransactionsController;
