const {Organisation, OrganisationMembers} = require('../models');
const {Response} = require('../libs');
const {HttpStatusCode, AclRoles} = require('../utils');

const IsOrgMember = async (req, res, next) => {
  try {
    const OrganisationId =
      req.body.organisation_id ||
      req.params.organisation_id ||
      req.query.organisation_id;

    if (!OrganisationId.trim()) {
      Response.setError(
        HttpStatusCode.STATUS_BAD_REQUEST,
        'Orgnisation ID is missing.'
      );
      return Response.send(res);
    }

    const organisation = await Organisation.findByPk(OrganisationId);

    if (!organisation) {
      Response.setError(
        HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
        'Orgnisation does not exist..'
      );
      return Response.send(res);
    }

    const member = await OrganisationMembers.findOne({
      where: {
        UserId: req.user.id,
        OrganisationId
      }
    });

    if (!member && req.user.RoleId !== (AclRoles.SuperAdmin || AclRoles.Donor)) {
      Response.setError(
        HttpStatusCode.STATUS_FORBIDDEN,
        'Access denied. Your not organisation member.'
      );
      return Response.send(res);
    }

    req.organisation = organisation;
    req.member = member;

    next();
  } catch (error) {
    Response.setError(
      HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
      'Server error. Please contact support.'
    );
    return Response.send(res);
  }
};

exports.IsOrgMember = IsOrgMember;
