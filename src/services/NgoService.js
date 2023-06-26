const {OrgAdminRolesToAcl} = require('../utils').Types;
const {Op} = require('sequelize');

const {userConst} = require('../constants');

const {User, Campaign, Product, OrganisationMembers} = require('../models');

const QueueService = require('./QueueService');
const MailerService = require('./MailerService');
const bcrypt = require('bcryptjs');

class NgoService {
  static createAdminAccount(organisation, data, role, newPassword) {
    return new Promise(async (resolve, reject) => {
      const password = bcrypt.hashSync(newPassword, 10);
      data.RoleId = OrgAdminRolesToAcl[role];

      User.create({
        ...data,
        password
      })
        .then(async user => {
          await OrganisationMembers.create({
            UserId: user.id,
            OrganisationId: organisation.id,
            role
          });
          MailerService.verify(
            user.email,
            user.first_name + ' ' + user.last_name,
            newPassword
          );
          await QueueService.createWallet(user.id, 'user');
          // send password to user
          resolve(user.toObject());
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  static getMembers(OrganisationId) {
    return OrganisationMembers.findAll({
      where: {
        OrganisationId,
        role: {
          [Op.ne]: 'vendor'
        }
      },
      include: [
        {
          model: User,
          as: 'User',
          attributes: userConst.publicAttr
        }
      ]
    });
  }

  static viewProductVendorOnCampaign() {
    return Campaign.findAll({
      include: [
        {
          model: Product,
          as: 'CampaignProducts'
        },
        {model: User, as: 'CampaignVendors'}
      ]
    });
  }
}

module.exports = NgoService;
