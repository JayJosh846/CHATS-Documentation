const {userConst} = require('../constants');
const {User, Complaint} = require('../models');

class ComplaintService {
  static createComplaint(complaint) {
    return Complaint.create(complaint);
  }

  static getComplaint(id) {
    return Complaint.findOne({
      where: {id},
      include: [
        'Campaign',
        {
          model: User,
          as: 'Beneficiary',
          attributes: userConst.publicAttr,
        },
      ],
    });
  }

  static getCampaignComplaints(CampaignId, extraClause = null) {
    return Complaint.findAndCountAll({
      where: {...extraClause, CampaignId},
      include: [
        {
          model: User,
          as: 'Beneficiary',
          attributes: userConst.publicAttr,
        },
      ],
    });
  }

  static getBeneficiaryComplaints(UserId, extraClause = null, include = []) {
    return Complaint.findAndCountAll({
      where: {...extraClause, UserId},
      include,
    });
  }

  static updateComplaint(id, update) {
    return Complaint.update(update, {where: {id}});
  }
}

module.exports = ComplaintService;
