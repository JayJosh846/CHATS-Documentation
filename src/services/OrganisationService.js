const {
  User,
  Market,
  Wallet,
  Organisation,
  Transaction,
  Campaign,
  OrganisationMembers
} = require('../models');
const {
  OrgRoles,
  AclRoles,
  GenearteVendorId,
  generateRandom
} = require('../utils');
const QueueService = require('./QueueService');
const bcrypt = require('bcryptjs');
const {Op, Sequelize} = require('sequelize');
const {userConst} = require('../constants');
const SmsService = require('./SmsService');
const MailerService = require('./MailerService');

class OrganisationService {
  static findOneById(id) {
    return User.findByPk(id, {
      include: {model: Organisation, as: 'Organisations'}
    });
  }

  static async getAllOrganisations() {
    return Organisation.findAll({
      include: [
        {
          where: {role: 'admin'},
          model: OrganisationMembers,
          as: 'Members'
        },
        {
          where: {
            transaction_type: 'transfer',
            status: 'success',
            BeneficiaryId: null,
            VendorId: null
          },
          model: Transaction,
          as: 'Transactions'
        },
        {
          where: {is_funded: true},
          model: Campaign,
          as: 'Campaigns'
        }
      ]
    });
  }

  static async getOrganisationWallet(id) {
    return Organisation.findOne({
      where: {
        id: Number(id)
      },
      include: {
        model: Wallet,
        as: 'Wallet'
      }
    });
  }

  static async getOrganisation(id) {
    return Organisation.findOne({
      where: {
        id: Number(id)
      }
    });
  }

  static async getAllOrganisationWallet() {
    return Organisation.findAll({
      include: {
        model: Wallet,
        as: 'Wallet'
      }
    });
  }

  static async addOrganisation(data, user) {
    return Organisation.create(data).then(organisation => {
      organisation.createMember({
        UserId: user.id,
        role: OrgRoles.Admin
      });
    });
  }

  static async addDonor(data, user, inviteeId) {
    return Organisation.create(data).then(organisation => {
      organisation.createMember({
        UserId: user.id,
        OrganisationId: inviteeId,
        role: 'donor'
      });
    });
  }

  static async updateOrganisationProfile(id, data = {}) {
    return Organisation.update(data, {
      where: {
        id
      }
    });
  }

  static async createMember(UserId, OrganisationId, role) {
    const exisiting = await OrganisationMembers.findOne({
      where: {
        UserId,
        OrganisationId
      }
    });

    if (exisiting) {
      return exisiting;
    }

    return OrganisationMembers.create({
      UserId,
      OrganisationId,
      role
    });
  }

  static async checkExist(id) {
    return Organisation.findByPk(id);
  }

  static async checkExistEmail(email) {
    return Organisation.findOne({
      where: {
        email: email
      }
    });
  }

  static async isMember(organisation, user) {
    return database.OrganisationMembers.findOne({
      where: {
        OrganisationId: organisation,
        UserId: user
      }
    });
  }
  static async getAllDonorMember(UserId) {
    return OrganisationMembers.findAll({
      where: {UserId}
    });
  }

  static async getAssociatedCampaigns(id) {
    return Organisation.findAll({
      where: {
        id
      },
      order: [['createdAt', 'DESC']],
      include: {
        model: Campaign,
        where: {
          is_public: false
        },
        as: 'associatedCampaigns'
      }
    });
  }

  static async getAllDonorsAdmin() {
    return Organisation.findAll({
      order: [['createdAt', 'DESC']],

      include: [
        {
          model: Campaign,
          where: {
            is_public: false
          },
          as: 'associatedCampaigns'
        }
      ]
    });
  }

  static async isMemberUser(user) {
    return OrganisationMembers.findOne({
      where: {
        UserId: user
      }
    });
  }

  static createVendorAccount(organisation, data, creator) {
    return new Promise((resolve, reject) => {
      let account = null;
      let store = null;

      const {address, store_name, location} = data;
      const rawPassword = generateRandom(8);
      const RoleId = AclRoles.Vendor;
      const OrganisationId = organisation.id;
      const password = bcrypt.hashSync(rawPassword, 10);
      const vendor_id = GenearteVendorId();
      User.create({
        ...data,
        vendor_id,
        RoleId,
        OrganisationId,
        password
      })
        .then(async _account => {
          account = _account;
          this.createMember(account.id, OrganisationId, OrgRoles.Vendor);
          return Market.create({
            store_name,
            address,
            location,
            UserId: account.id
          });
        })
        .then(async _store => {
          store = _store;
          await QueueService.createWallet(account.id, 'user');
          MailerService.verify(
            data.email,
            data.first_name + ' ' + data.last_name,
            rawPassword,
            vendor_id
          );
          SmsService.sendOtp(
            data.phone,
            `Hi, ${data.first_name}  ${data.last_name} your CHATS account ID is: ${vendor_id} , password is: ${rawPassword}`
          );
          account = account.toObject();
          account.Store = store.toJSON();
          resolve(account);
        })
        .catch(error => {
          if (account && !store) {
            User.destroy({
              where: {
                id: account.id
              }
            });
          }
          reject(error);
        });
    });
  }
  static async getAllNGOs() {
    return Organisation.findAll();
  }
  static async beneficiariesTransactions(OrganisationId) {
    return Transaction.findAll({
      where: {
        SenderWalletId: Sequelize.where(
          Sequelize.col('SenderWallet.UserId'),
          OrganisationId
        )
      },
      include: [
        {
          model: Wallet,
          as: 'SenderWallet',
          attributes: [],
          where: {
            AccountUserType: 'organisation',
            CampaignId: {
              [Op.ne]: null
            }
          }
        },

        {
          model: Wallet,
          as: 'RecievingWallet',
          attributes: {
            exclude: ['privateKey', 'bantuPrivateKey']
          },
          include: [
            {
              model: User,
              as: 'User',
              attributes: userConst.publicAttr
            }
          ]
        }
      ]
    });
  }
}

module.exports = OrganisationService;
