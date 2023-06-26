const {User} = require('../models');
const {Response} = require('../libs');
const {
  OrganisationService,
  NgoService,
  ProductService,
  MailerService
} = require('../services');
const {HttpStatusCode, SanitizeObject} = require('../utils');
const utils = require('../libs/Utils');

class NgoController {
  static async getAllNGO(req, res) {
    try {
      const allNGOs = await OrganisationService.getAllOrganisations();
      if (allNGOs.length > 0) {
        Response.setSuccess(200, 'NGOs retrieved', allNGOs);
      } else {
        Response.setSuccess(200, 'No NGO found');
      }
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getOneNGO(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      Response.setError(400, 'Invalid Request Parameter');
      return Response.send(res);
    }
    try {
      const theNgo = await OrganisationService.getOrganisation(id);
      if (!theNgo) {
        Response.setError(404, `Cannot find NGO with the id ${id}`);
      } else {
        Response.setSuccess(200, 'Found NGO', theNgo);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(404, error);
      return Response.send(res);
    }
  }

  static async createAdminMember(req, res) {
    try {
      const {role, ...data} = SanitizeObject(req.body);
      const {user, organisation} = req;
      const newPassword = utils.generatePassword();
      const admin = await NgoService.createAdminAccount(
        organisation,
        data,
        role,
        newPassword
      );

      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Account Created.',
        admin
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support.`
      );
      return Response.send(res);
    }
  }

  static async members(req, res) {
    try {
      const memebrs = await NgoService.getMembers(req.organisation.id);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'NGO members', memebrs);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Server Error: Please retry.`
      );
      return Response.send(res);
    }
  }

  static async viewProductVendorOnCampaign(req, res) {
    try {
      const memebrs = await NgoService.viewProductVendorOnCampaign();
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'NGO members', memebrs);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Server Error: Please retry.`
      );
      return Response.send(res);
    }
  }
}

module.exports = NgoController;
