const {FundAccount} = require('../models');

class DepositService {
  static findOrgDeposits(OrganisationId, extraClause = null) {
    return FundAccount.findAll({
      where: {
        OrganisationId,
        ...extraClause,
      },
    });
  }

  static findOrgDepositByRef(OrganisationId, transactionReference) {
    return FundAccount.findOne({
      where: {
        OrganisationId,
        transactionReference,
      },
    });
  }

  static async updateFiatDeposit(transactionReference, updateData) {
    const deposit = await FundAccount.findOne({where: {transactionReference}});
    if (!deposit) return null;
    deposit.update(updateData);
    return deposit;
  }
}

module.exports = DepositService;
