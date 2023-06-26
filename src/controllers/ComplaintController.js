const {Response} = require('../libs');
const {ComplaintService, CampaignService} = require('../services');
const {SanitizeObject, HttpStatusCode} = require('../utils');

class ComplaintController {
  static async getPubCampaignConplaints(req, res) {
    try {
      const filter = SanitizeObject(req.query, ['status']);
      const campaign = await CampaignService.getPubCampaignById(
        req.params.campaign_id,
      );
      const {
        count: complaints_count,
        rows: Complaints,
      } = await ComplaintService.getCampaignComplaints(
        req.params.campaign_id,
        filter,
      );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Complaints.', {
        ...campaign,
        complaints_count,
        Complaints,
      });
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`,
      );
      return Response.send(res);
    }
  }
  static async getCampaignConplaints(req, res) {
    try {
      const filter = SanitizeObject(req.query, ['status']);
      const campaign = req.campaign.toJSON();
      const {
        count: complaints_count,
        rows: Complaints,
      } = await ComplaintService.getCampaignComplaints(
        req.params.campaign_id,
        filter,
      );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Campaign Complaints.', {
        ...campaign,
        complaints_count,
        Complaints,
      });
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`,
      );
      return Response.send(res);
    }
  }

  static async getCampaignConplaint(req, res) {
    try {
      const complaint = await ComplaintService.getComplaint(
        req.params.complaint_id,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Complaint.',
        complaint,
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`,
      );
      return Response.send(res);
    }
  }

  static async resolveCampaignConplaint(req, res) {
    try {
      await ComplaintService.updateComplaint(req.params.complaint_id, {
        status: 'resolved',
      });
      const complaint = req.complaint.toJSON();
      complaint.status = 'resolved';
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Complaint Resolved.',
        complaint,
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`,
      );
      return Response.send(res);
    }
  }
}

module.exports = ComplaintController;
