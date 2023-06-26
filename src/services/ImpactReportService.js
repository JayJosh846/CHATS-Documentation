const {Sequelize, Op} = require('sequelize');
const {User, CampaignImpactReport, Campaign} = require('../models');

class ImpactReportService {
  static async create(reports) {
    try {
      return await CampaignImpactReport.create(reports);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  static async get(id) {
    return await ImpactReports.findByPk(id);
  }
  static async getReportByCampaignId(campaignId) {
    return CampaignImpactReport.findAll({
      where: {
        CampaignId: campaignId
      }
    });
  }
  static async getAll() {
    return await CampaignImpactReport.findAll();
  }
  static async delete(id) {}
  static async update(report) {}
}
module.exports = ImpactReportService;
