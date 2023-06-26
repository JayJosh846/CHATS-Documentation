const {Sequelize, Op} = require('sequelize');
const {
  User,
  Wallet,
  Campaign,
  Complaint,
  Beneficiary,
  VoucherToken,
  Transaction,
  FormAnswer,
  AssociatedCampaign,
  CampaignForm,
  Organisation,
  Task,
  CampaignVendor
} = require('../models');
const {userConst, walletConst} = require('../constants');
const Transfer = require('../libs/Transfer');
const QueueService = require('./QueueService');
const {generateTransactionRef} = require('../utils');
const Pagination = require('../utils/pagination');

class CampaignService {
  static campaignHistory(id) {
    return Campaign.findByPk(id, {
      include: ['history']
    });
  }
  static getACampaignWithBeneficiaries(CampaignId, type) {
    return Campaign.findAll({
      where: {
        type,
        id: {
          [Op.ne]: CampaignId
        }
      },
      include: ['Beneficiaries']
    });
  }

  static getACampaignWithReplica(id, type) {
    return Campaign.findByPk(id, {
      where: {
        type
      },
      include: ['Beneficiaries']
    });
  }

  static searchCampaignTitle(title, extraClause = null) {
    const where = {
      ...extraClause,
      title: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('title')),
        'LIKE',
        `%${title.toLowerCase()}%`
      )
    };

    return Campaign.findOne({
      where
    });
  }

  static getCampaignToken(campaignId) {
    return VoucherToken.findAll({where: {campaignId}});
  }

  static getCampaignById(id) {
    return Campaign.findByPk(id, {
      include: ['Organisation'],
      include: {
        model: User,
        as: 'Beneficiaries',
        attributes: [
          'first_name',
          'last_name',
          'gender',
          'marital_status',
          'dob',
          'location'
        ]
      }
    });
  }
  static getPubCampaignById(id) {
    return Campaign.findOne({where: {id, is_public: true}});
  }

  static campaignBeneficiaryExists(CampaignId, UserId) {
    return Beneficiary.findOne({
      where: {
        CampaignId,
        UserId
      }
    });
  }

  static findAllBeneficiaryOnboard(CampaignId, UserId) {
    return Beneficiary.findAll({
      where: {
        CampaignId,
        UserId
      }
    });
  }

  static addCampaign(newCampaign) {
    return Campaign.create(newCampaign);
  }

  static addBeneficiaryComplaint(campaign, UserId, report) {
    return campaign.createComplaint({
      UserId,
      report
    });
  }

  static addBeneficiary(CampaignId, UserId, source = null) {
    return Beneficiary.findOne({
      where: {
        CampaignId,
        UserId
      }
    }).then(beneficiary => {
      if (beneficiary) {
        return beneficiary;
      }
      return Beneficiary.create({
        CampaignId,
        UserId,
        source
      }).then(async newBeneficiary => {
        await QueueService.createWallet(UserId, 'user', CampaignId);
        return newBeneficiary;
      });
    });
  }

  static removeBeneficiary(CampaignId, UserId) {
    return Beneficiary.destroy({
      where: {
        CampaignId,
        UserId
      }
    }).then(res => {
      if (res) {
        return Wallet.destroy({
          where: {
            wallet_type: 'user',
            CampaignId,
            UserId
          }
        });
      }
      return null;
    });
  }

  static async approveVendorForCampaign(CampaignId, VendorId) {
    const record = await CampaignVendor.findOne({
      where: {
        CampaignId,
        VendorId
      }
    });
    if (record) {
      await record.update({
        approved: true
      });
      return record;
    }

    return await CampaignVendor.create({
      CampaignId,
      VendorId,
      approved: true
    });
  }

  static async removeVendorForCampaign(CampaignId, VendorId) {
    const record = await CampaignVendor.findOne({
      where: {
        CampaignId,
        VendorId
      }
    });
    if (record) {
      await record.destroy({
        CampaignId,
        VendorId
      });
      return record;
    }

    return null;
  }

  static campaignVendors(CampaignId) {
    return CampaignVendor.findAll({
      where: {
        CampaignId
      },
      include: {
        model: User,
        as: 'Vendor',
        attributes: userConst.publicAttr
      }
    });
  }

  static async getVendorCampaigns(VendorId) {
    return CampaignVendor.findAll({
      where: {
        VendorId
      },
      include: ['Campaign']
    });
  }

  static async getVendorCampaignsAdmin(VendorId) {
    return CampaignVendor.findAll({
      include: [
        {
          model: User,
          as: 'Vendor',
          attributes: ['first_name', 'last_name'],
          where: {
            vendor_id: VendorId
          }
        }
      ]
    });
  }
  static getPrivateCampaignWithBeneficiaries(id) {
    return Campaign.findOne({
      order: [['createdAt', 'ASC']],
      where: {
        id,
        is_public: false
      },
      // attributes: {
      //   include: [
      //     [Sequelize.fn("COUNT", Sequelize.col("Beneficiaries.id")), "beneficiaries_count"]
      //   ]
      // },
      include: [
        {
          model: User,
          as: 'Beneficiaries',
          attributes: userConst.publicAttr,
          through: {
            attributes: []
          }
        },
        {model: Task, as: 'Jobs'},
        {
          model: Wallet,
          as: 'BeneficiariesWallets',
          attributes: walletConst.walletExcludes
        }
      ],
      group: [
        'Campaign.id',
        'Beneficiaries.id',
        'Jobs.id',
        'BeneficiariesWallets.uuid'
      ]
    });
  }
  static getCampaignWithBeneficiaries(id) {
    return Campaign.findOne({
      order: [['createdAt', 'DESC']],
      where: {
        id
      },
      // attributes: {
      //   include: [
      //     [Sequelize.fn("COUNT", Sequelize.col("Beneficiaries.id")), "beneficiaries_count"]
      //   ]
      // },
      include: [
        {
          model: User,
          as: 'Beneficiaries',
          attributes: userConst.publicAttr,
          through: {
            attributes: []
          }
        },
        {model: Task, as: 'Jobs'},
        {
          model: Wallet,
          as: 'BeneficiariesWallets',
          attributes: walletConst.walletExcludes
        }
      ]
      // group: [
      //   'Campaign.id',
      //   'Beneficiaries.id',
      //   'Jobs.id',
      //   'BeneficiariesWallets.uuid'
      // ]
    });
  }

  static getCampaignComplaint(CampaignId) {
    return Complaint.findAll({
      where: {
        CampaignId
      },
      include: [
        {
          model: User,
          as: 'Beneficiary',
          attributes: userConst.publicAttr
        }
      ]
    });
  }

  static beneficiaryCampaings(UserId, extraClasue = null) {
    return Beneficiary.findAll({
      where: {
        UserId
      },
      include: [
        {
          model: Campaign,
          where: {
            ...extraClasue
          },
          as: 'Campaign',
          include: ['Organisation']
        }
      ]
    });
  }

  static beneficiaryCampaingsAdmin(UserId) {
    return Beneficiary.findAll({
      where: {
        UserId
      },
      include: [
        {
          model: Campaign,
          as: 'Campaign',
          include: ['Organisation']
        }
      ]
    });
  }
  static getPublicCampaigns(queryClause = {}) {
    const where = queryClause;
    return Campaign.findAll({
      order: [['createdAt', 'DESC']],
      where: {
        ...where
      },
      include: ['Organisation'],
      include: [
        {model: Task, as: 'Jobs'},
        {
          model: User,
          as: 'Beneficiaries',
          attributes: userConst.publicAttr
        }
      ]
    });
  }
  static getPrivateCampaigns(queryClause = {}, id) {
    let where = queryClause;
    return Organisation.findOne({
      where: {
        id
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Campaign,
          where: {
            ...where,
            is_public: false
          },
          as: 'associatedCampaigns',

          include: [
            {model: Task, as: 'Jobs'},
            {model: User, as: 'Beneficiaries'}
          ]
        }
      ]
    });
  }

  static getPrivateCampaignsAdmin(id) {
    return Organisation.findOne({
      where: {
        id
      },
      order: [['updatedAt', 'DESC']],
      include: {
        model: Campaign,
        where: {
          is_public: false
        },
        as: 'associatedCampaigns',

        include: [
          {model: Task, as: 'Jobs'},
          {model: User, as: 'Beneficiaries'}
        ]
      }
    });
  }
  static getCash4W(OrganisationId) {
    return Campaign.findAll({
      where: {
        type: 'cash-for-work',
        OrganisationId
      },
      // attributes: {
      //   include: [
      //     [Sequelize.fn("COUNT", Sequelize.col("Beneficiaries.id")), "beneficiaries_count"]
      //   ]
      // },
      include: [
        {model: Task, as: 'Jobs'},
        {model: User, as: 'Beneficiaries'}
      ]
      // includeIgnoreAttributes: false,
      // group: [
      //   "Campaign.id"
      // ],
    });
  }
  static async getCampaigns(OrganisationId, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;

    const {limit, offset} = await Pagination.getPagination(page, size);
    delete extraClause.page;
    delete extraClause.size;
    let queryOptions = {};
    if (page && size) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const campaign = await Campaign.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...queryOptions,
      where: {
        ...extraClause,
        OrganisationId
      },

      include: [
        {model: Task, as: 'Jobs'},
        {model: User, as: 'Beneficiaries', attributes: userConst.publicAttr}
      ]
    });
    const response = await Pagination.getPagingData(campaign, page, limit);
    return response;
  }
  static getCash4W(OrganisationId) {
    return Campaign.findAll({
      where: {
        type: 'cash-for-work',
        OrganisationId
      },

      include: [
        {model: Task, as: 'Jobs'},
        {model: User, as: 'Beneficiaries'}
      ]
    });
  }

  static updateSingleCampaign(id, update) {
    return Campaign.update(update, {
      where: {
        id
      }
    });
  }

  // static async getAllCampaigns(OrganisationId) {
  //   return Campaign.findAll({
  //     order: [['createdAt', 'DESC']],
  //     attributes: [
  //       [Sequelize.fn('sum', Sequelize.col('minting_limit')), 'total_items'],
  //       [Sequelize.fn('sum', Sequelize.col('minting_limit')), 'total_cash']
  //     ],
  //     where: {
  //       is_funded: true,
  //       OrganisationId
  //     },
  //     include: ['Organisation']
  //   });
  // }
  static async getAllCampaigns(extraClause = null) {
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
    const campaign = await Campaign.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...options,
      where: {
        ...extraClause
      },
      include: ['Organisation']
    });
    const response = await Pagination.getPagingData(campaign, page, limit);
    return response;
  }
  static async getOurCampaigns(
    userId,
    OrganisationId,
    campaignType = 'campaign'
  ) {
    try {
      return await Campaign.findAll({
        where: {
          OrganisationId: OrganisationId,
          type: campaignType
        }
      });
    } catch (error) {
      // console.log(error)
      throw error;
    }
  }

  static async beneficiariesToCampaign(payload) {
    return Beneficiary.bulkCreate(payload);
  }
  static async fundWallets(payload, userId, organisationId, campaignId) {
    try {
      // console.log(payload);
      // Approve Fund For Campaign
      payload.forEach(element => {
        // console.table(element);
        return Transfer.processTransfer(userId, element.UserId, element.amount);
      });
    } catch (error) {
      throw error;
    }
  }
  static async updateCampaign(id, updateCampaign) {
    try {
      const CampaignToUpdate = await Campaign.findOne({
        where: {
          id: Number(id)
        }
      });

      if (CampaignToUpdate) {
        return await Campaign.update(updateCampaign, {
          where: {
            id: Number(id)
          }
        });
        //    updateCampaign;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async getACampaign(id, OrganisationId) {
    return Campaign.findAll({
      where: {
        id: Number(id)
      },
      include: ['Beneficiaries']
    });
  }
  static async deleteCampaign(id) {
    try {
      const CampaignToDelete = await Campaign.findOne({
        where: {
          id: Number(id)
        }
      });

      if (CampaignToDelete) {
        const deletedCampaign = await Campaign.destroy({
          where: {
            id: Number(id)
          }
        });
        return deletedCampaign;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static cashForWorkCampaignByApprovedBeneficiary() {
    return Campaign.findAll({
      order: [['createdAt', 'DESC']],
      where: {
        type: 'cash-for-work'
      },
      include: [
        {
          model: Beneficiary,
          as: 'Beneficiaries',
          attribute: [],
          where: {
            approved: true
          }
        }
      ]
    });
  }

  static cash4work(id, campaignId) {
    return User.findOne({
      where: {id},
      attributes: userConst.publicAttr,
      include: [
        {
          model: Campaign,
          as: 'Campaigns',
          where: {
            type: 'cash-for-work',
            id: campaignId
          },
          include: {model: Task, as: 'Jobs'}
        }
      ]
    });
  }

  static cash4workfield(id) {
    return Campaign.findOne({
      where: {
        type: 'cash-for-work',
        id
      },
      include: {model: Task, as: 'Jobs'}
    });
  }
  static async getPrivateCampaignWallet(id) {
    return Campaign.findOne({
      where: {
        id: Number(id),
        OrganisationId: {
          [Op.ne]: null
        }
      },
      include: {
        model: Wallet,
        as: 'Wallet'
      }
      // include: ["Beneficiaries"],
    });
  }

  static async getCampaignWallet(id, OrganisationId) {
    return Campaign.findOne({
      where: {
        id: Number(id),
        OrganisationId
      },
      include: [
        {
          model: Wallet,
          as: 'Wallet'
        }
      ]
      // include: ["Beneficiaries"],
    });
  }

  static async getWallet(address) {
    return Wallet.findAll({
      where: {
        address
      }
    });
  }

  static async formAnswer(data) {
    return await FormAnswer.create(data);
  }
  static async findCampaignForm(id) {
    return await CampaignForm.findOne({
      where: {id},
      include: ['campaigns']
    });
  }
  static async findCampaignFormAnswer(where) {
    return await FormAnswer.findOne({
      where
    });
  }
  static async findCampaignFormAnswers(where) {
    return await FormAnswer.findAll({
      where
    });
  }
  static async findCampaignFormBeneficiary(id) {
    return await CampaignForm.findOne({
      where: {id},
      include: {
        model: Campaign,
        as: 'campaigns',
        where: {id}
      }
    });
  }
  static async findCampaignFormByTitle(title) {
    return await CampaignForm.findOne({
      where: {title}
    });
  }
  static async findCampaignFormById(id) {
    return await CampaignForm.findOne({
      where: {id}
    });
  }
  static async findCampaignFormByCampaignId(id) {
    return await Campaign.findOne({
      where: {id},
      include: ['campaign_form']
    });
  }
  static async campaignForm(data) {
    return await CampaignForm.create(data);
  }
  static async getCampaignForm(organisationId, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;
    const {limit, offset} = await Pagination.getPagination(page, size);
    delete extraClause.page;
    delete extraClause.size;

    const form = await CampaignForm.findAndCountAll({
      order: [['createdAt', 'DESC']],
      where: {organisationId, ...extraClause},
      limit,
      offset,
      include: ['campaigns']
    });
    const response = await Pagination.getPagingData(form, page, limit);
    return response;
  }

  // static async handleCampaignApproveAndFund(campaign, campaignWallet, OrgWallet, beneficiaries) {
  //   const payload = {
  //     CampaignId: campaign.id,
  //     NgoWalletAddress: OrgWallet.address,
  //     CampaignWalletAddress: campaignWallet.address,
  //     amount: campaign.budget,
  //     beneficiaries
  //   };

  //   // : beneficiaries.map(beneficiary => {
  //   //   const bWalletId = beneficiary.User.Wallets.length ? beneficiary.User.Wallets[0].uuid : null;
  //   //   return [
  //   //     beneficiary.UserId,
  //   //     bWalletId
  //   //   ]
  //   // })

  //   // Queue fuding disbursing
  //   const org = await Wallet.findOne({where: {uuid: OrgWallet.uuid}})

  //   if
  //   await Wallet.update({
  //     balance: Sequelize.literal(`balance - ${campaign.budget}`)
  //   }, {
  //     where: {
  //       uuid: OrgWallet.uuid
  //     }
  //   });

  //   return {
  //     campaign,
  //     transaction
  //   }
  // }
}

module.exports = CampaignService;
