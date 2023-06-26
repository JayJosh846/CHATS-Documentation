const {
  body
} =  require('express-validator');
const { Response } = require('../libs');
const { ComplaintService } = require('../services');
const { HttpStatusCode } = require('../utils');

const BaseValidator = require('./BaseValidator');

class ComplaintValidator extends BaseValidator {

  static addComplaintRules() {
    return [
      body('report')
      .notEmpty()
      .withMessage('Report is required.')
      .isLength({
        min: 5,
        max: 200
      })
      .withMessage('Reposrt should be between 5 and 200 characters.')
    ]
  }

  static async complaintBelongsToCampaign(req, res, next) {
    try {
      const campaignId = req.params.campaign_id || req.body.campaign_id || req.campaign.id;
      const complaintId = req.params.complaint_id || req.body.complaint_id;
      const complaint = await ComplaintService.getComplaint(complaintId);

      if(!complaint) {
        Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Complaint Does Not Exist');
        return Response.send(res);
      }

      if(campaignId != complaint.CampaignId) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Complaint Does not belong to selected campaign.');
        return Response.send(res);
      }

      req.complaint = complaint;
      next();
    } catch (error) {
      
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Technical Error occured. Please try again.');
      return Response.send(res);
    }
  }
}

module.exports = ComplaintValidator;