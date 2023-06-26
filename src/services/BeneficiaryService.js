const {AclRoles} = require('../utils');
const {
  User,
  Beneficiary,
  Campaign,
  Wallet,
  Product,
  Transaction,
  Market,
  FormAnswer,
  Group,
  sequelize
} = require('../models');
const {Op, Sequelize} = require('sequelize');
const {userConst, walletConst} = require('../constants');
const moment = require('moment');
const Pagination = require('../utils/pagination');

class BeneficiariesService {
  static capitalizeFirstLetter(str) {
    let string = str.toLowerCase();
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  static nonOrgBeneficiaries(queryClause = {}, OrganisationId) {
    let where = {...queryClause};

    if (!where.nin) where.nin = '';
    if (!where.email) where.email = '';
    if (!where.phone) where.phone = '';
    let index = where.phone[0];
    if (index == 0) where.phone = where.phone.substring(1, where.phone.length);
    if (!where.first_name) {
      where.first_name = '';
    } else where.first_name = this.capitalizeFirstLetter(where.first_name);
    if (!where.last_name) {
      where.last_name = '';
    } else where.last_name = this.capitalizeFirstLetter(where.last_name);
    return User.findAll({
      where: {
        RoleId: AclRoles.Beneficiary,
        [Op.or]: [
          {
            nin: {
              [Op.like]: `%${where.nin}%`
            },
            phone: {
              [Op.like]: `%${where.phone}%`
            },
            email: {
              [Op.like]: `%${where.email}%`
            },
            first_name: {
              [Op.like]: `%${where.first_name}%`
            },
            last_name: {
              [Op.like]: `%${where.last_name}%`
            }
          }
        ],
        [Op.ne]: Sequelize.where(
          Sequelize.col('Campaigns.OrganisationId', OrganisationId)
        )
      },
      attributes: userConst.publicAttr,
      include: [
        {
          model: Campaign,
          as: 'Campaigns',
          through: {
            where: {
              approved: true
            }
          },
          attributes: [],
          require: true
        }
      ]
    });
  }
  static async getAllUsers() {
    return User.findAll({
      where: {
        RoleId: 5
      }
    });
  }

  static async addUser(newUser) {
    return User.create(newUser);
  }

  static async updateUser(id, updateUser) {
    const UserToUpdate = await User.findOne({
      where: {
        id: id
      }
    });

    if (UserToUpdate) {
      await User.update(updateUser, {
        where: {
          id: id
        }
      });

      return updateUser;
    }
    return null;
  }

  static async getAUser(id) {
    return User.findOne({
      where: {
        id: id,
        RoleId: AclRoles.Beneficiary
      }
    });
  }

  static async getUser(id) {
    return User.findOne({
      where: {
        id: id
      },
      include: ['Wallet']
    });
  }
  static async deleteUser(id) {
    const UserToDelete = await User.findOne({
      where: {
        id: id
      }
    });

    if (UserToDelete) {
      return User.destroy({
        where: {
          id: id
        }
      });
    }
    return null;
  }

  static async checkBeneficiary(id) {
    return Beneficiary.findOne({
      where: {
        id: id
      }
    });
  }

  /**
   *
   * @param {interger} CampaignId Campaign Unique ID
   * @param {integer} UserId Beneficiary Account ID
   */
  static async updateCampaignBeneficiary(CampaignId, UserId, data) {
    const beneficiary = await Beneficiary.findOne({
      where: {
        CampaignId,
        UserId
      }
    });
    if (!beneficiary) throw new Error('Beneficiary Not Found.');
    beneficiary.update(data);
    return beneficiary;
  }

  static async approveAllCampaignBeneficiaries(CampaignId, ids) {
    return Beneficiary.update(
      {
        approved: true,
        rejected: false
      },
      {
        where: {
          CampaignId,
          UserId: ids
        }
      }
    );
  }
  static async rejectAllCampaignBeneficiaries(CampaignId, ids) {
    return Beneficiary.update(
      {
        approved: false,
        rejected: true
      },
      {
        where: {
          CampaignId,
          UserId: ids
        }
      }
    );
  }

  static async createComplaint(data) {
    return Complaint.create(data);
  }

  static async updateComplaint(id) {
    return Complaint.update(
      {
        status: 'resolved'
      },
      {
        where: {
          id
        }
      }
    );
  }

  static async checkComplaint(id) {
    return Complaint.findOne({
      where: {
        id: id
      }
    });
  }

  static async organisationBeneficiaryDetails(id, OrganisationId) {
    return User.findOne({
      where: {
        id
      },
      attributes: userConst.publicAttr,

      include: [
        {model: Group, as: 'members', include: ['group_members']},
        {
          order: [['createdAt', 'ASC']],
          model: Campaign,
          as: 'Campaigns',
          require: true,
          where: {
            OrganisationId
          },
          include: [
            {where: {UserId: id}, model: Wallet, as: 'BeneficiariesWallets'}
          ]
        }
      ]
    });
  }

  static async beneficiaryDetails(id, extraClause = null) {
    return User.findOne({
      where: {
        ...extraClause,
        id,
        RoleId: AclRoles.Beneficiary
      },
      attributes: userConst.publicAttr,
      include: [
        {
          model: Campaign,
          as: 'Campaigns',
          through: {
            attributes: []
          }
        },
        {
          model: Wallet,
          as: 'Wallets',
          include: [
            // "ReceivedTransactions",
            'SentTx'
          ]
        }
      ]
    });
  }

  static async beneficiaryProfile(id) {
    return User.findOne({
      where: {
        id,
        RoleId: AclRoles.Beneficiary
      },
      include: [
        {
          model: Campaign,
          as: 'Campaigns',
          through: {
            attributes: []
          },
          include: ['Organisation']
        },
        {
          order: [['createdAt', 'ASC']],
          model: Wallet,
          as: 'Wallets'
        }
      ]
    });
  }

  static async beneficiaryTransactions(UserId) {
    return Transaction.findAll({
      where: {
        [Op.or]: {
          walletSenderId: Sequelize.where(
            Sequelize.col('SenderWallet.UserId'),
            UserId
          ),
          walletRecieverId: Sequelize.where(
            Sequelize.col('ReceiverWallet.UserId'),
            UserId
          )
        }
      },
      include: [
        {
          model: Wallet,
          as: 'SenderWallet',
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
        },
        {
          model: Wallet,
          as: 'ReceiverWallet',

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

  static async findOrgnaisationBeneficiaries(OrganisationId, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;
    delete extraClause.page;
    delete extraClause.size;
    const {limit, offset} = await Pagination.getPagination(page, size);

    let options = {};
    if (page && size) {
      options.limit = limit;
      options.offset = offset;
    }
    const users = await User.findAndCountAll({
      ...options,
      where: {
        OrganisationId: Sequelize.where(
          Sequelize.col('Campaigns.OrganisationId'),
          OrganisationId
        )
      },
      attributes: userConst.publicAttr,
      include: [
        {
          model: Campaign,
          as: 'Campaigns',
          through: {
            where: {
              approved: true
            }
          },
          attributes: [],
          require: true
        },
        {model: Group, as: 'members'}
      ]
    });
    const response = await Pagination.getPagingData(users, page, limit);
    return response;
  }

  static async fetchCampaignBeneficiary(CampaignId, UserId) {
    return Beneficiary.findOne({
      where: {
        UserId,
        CampaignId
      }
    });
  }

  static async findCampaignBeneficiary(UserId) {
    return Beneficiary.findAll({
      where: {
        UserId,
        CampaignId: {
          [Op.ne]: null
        }
      },
      include: [
        {
          model: User,
          as: 'User',
          attributes: userConst.publicAttr,
          include: {
            model: FormAnswer,
            as: 'Answers'
          }
        }
      ]
    });
  }
  static async findCampaignBeneficiaries(CampaignId, extraClause = null) {
    return Beneficiary.findAll({
      where: {
        ...extraClause,
        CampaignId
      },
      include: [
        {
          model: User,
          as: 'User',
          attributes: userConst.publicAttr,
          include: [
            {
              model: FormAnswer,
              as: 'Answers'
            },
            {model: Group, as: 'members', include: ['group_members']}
          ]
        }
      ]
    });
  }
  static async getBeneficiariesAdmin() {
    return User.findAll({
      where: {
        RoleId: AclRoles.Beneficiary
      },
      include: {
        where: {
          transaction_origin: 'store',
          transaction_type: 'spent',
          is_approved: true,
          status: 'success'
        },
        model: Transaction,
        as: 'OrderTransaction'
      }
    });
  }

  static async getBeneficiaries(OrganisationId) {
    return User.findAll({
      where: {
        RoleId: AclRoles.Beneficiary,
        OrganisationId: Sequelize.where(
          Sequelize.col('Campaigns.OrganisationId'),
          OrganisationId
        )
      },
      attributes: userConst.publicAttr,
      include: [
        {
          model: Campaign,
          as: 'Campaigns',
          where: {OrganisationId},
          through: {
            where: {
              approved: true
            }
          },
          attributes: [],
          require: true
        }
      ]
    });
  }

  static async getBeneficiariesTotalAmount(OrganisationId) {
    return User.findAll({
      where: {
        RoleId: AclRoles.Beneficiary,
        OrganisationId: Sequelize.where(
          Sequelize.col('Campaigns.OrganisationId'),
          OrganisationId
        )
      },
      include: [
        {
          model: Campaign,
          as: 'Campaigns',
          where: {OrganisationId},
          through: {
            where: {
              approved: true
            },
            attributes: []
          },
          include: ['Organisation']
        },
        {
          model: Wallet,
          as: 'Wallets'
        }
      ]
    });
  }

  static async beneficiaryChart(BeneficiaryId, period) {
    return Transaction.findAndCountAll({
      where: {
        BeneficiaryId,
        createdAt: {
          [Op.gte]:
            period === 'daily'
              ? moment().subtract(1, 'days').toDate()
              : period === 'weekly'
              ? moment().subtract(7, 'days').toDate()
              : period === 'monthly'
              ? moment().subtract(1, 'months').toDate()
              : period === 'yearly'
              ? moment().subtract(1, 'years').toDate()
              : null
        }
      },
      include: [
        {
          model: Wallet,
          as: 'SenderWallet',
          attributes: {
            exclude: walletConst.walletExcludes
          },
          include: ['Campaign']
        },
        {
          model: Wallet,
          as: 'ReceiverWallet',
          attributes: {
            exclude: walletConst.walletExcludes
          }
        },
        {
          model: User,
          as: 'Organisations',
          attributes: userConst.publicAttr
        }
      ]
    });
  }

  //get all beneficiaries by marital status

  static async findOrganisationVendorTransactions(
    OrganisationId,
    extraClause = {}
  ) {
    const page = extraClause.page;
    const size = extraClause.size;
    delete extraClause.page;
    delete extraClause.size;
    const {limit, offset} = await Pagination.getPagination(page, size);

    let options = {};
    if (page && size) {
      options.limit = limit;
      options.offset = offset;
    }
    const transactions = await Transaction.findAndCountAll({
      ...options,
      include: [
        {
          model: Wallet,
          as: 'SenderWallet',
          attributes: {
            exclude: walletConst.walletExcludes
          },
          where: {
            OrganisationId
          },
          include: ['Campaign']
        },
        {
          model: Wallet,
          as: 'ReceiverWallet',
          attributes: {
            exclude: walletConst.walletExcludes
          }
        },
        {
          model: User,
          as: 'Beneficiary',
          attributes: userConst.publicAttr
        }
      ]
    });
    const response = await Pagination.getPagingData(transactions, page, limit);
    return response;
  }

  static async findVendorTransactionsPerBene(CampaignId) {
    return Transaction.findAll({
      include: [
        {
          model: Wallet,
          as: 'SenderWallet',
          attributes: {
            exclude: walletConst.walletExcludes
          },
          where: {
            CampaignId
          },
          include: ['Campaign']
        },
        {
          model: Wallet,
          as: 'ReceiverWallet',
          attributes: {
            exclude: walletConst.walletExcludes
          }
        },
        {
          model: User,
          as: 'Beneficiary',
          attributes: userConst.publicAttr
        }
      ]
    });
  }
  static async getApprovedBeneficiaries(CampaignId) {
    return Beneficiary.findAll({
      where: {
        CampaignId,
        approved: true
      },
      include: [
        {
          model: User,
          attributes: {
            exclude: walletConst.walletExcludes
          },
          as: 'User',
          include: [
            {
              model: Wallet,
              as: 'Wallets',
              where: {
                CampaignId
              }
            }
          ]
        }
      ]
    });
  }
  static async getApprovedFundBeneficiaries(CampaignId) {
    return Beneficiary.findAll({
      where: {
        CampaignId,
        approved: true
      },
      include: [
        {
          model: User,
          attributes: {
            exclude: walletConst.walletExcludes
          },
          as: 'User',
          include: [
            {
              model: Wallet,
              as: 'Wallets',
              where: {
                CampaignId
              }
            }
          ]
        }
      ]
    });
  }

  static async payForProduct(VendorId, ProductId) {
    return User.findOne({
      where: {id: VendorId},
      attributes: userConst.publicAttr,
      include: [
        {
          model: Market,
          as: 'Store',
          include: [
            {
              model: Product,
              as: 'Products',
              where: {id: ProductId},
              attributes: [
                // [Sequelize.fn('DISTINCT', Sequelize.col('product_ref')), 'product_ref'],
                'id',
                'tag',
                'cost',
                'type'
              ],
              group: ['product_ref', 'tag', 'cost', 'type']
            }
          ]
        },
        {model: Wallet, as: 'Wallets'}
      ]
    });
  }
}

module.exports = BeneficiariesService;
