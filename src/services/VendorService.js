const {Sequelize, Op} = require('sequelize');

const moment = require('moment');

const {userConst, walletConst} = require('../constants');

const {
  User,
  Store,
  BankAccount,
  Order,
  Market,
  Campaign,
  Wallet,
  Product,
  OrderProduct,
  Organisation,
  Transaction,
  OrganisationMembers
} = require('../models');

const {
  OrgRoles,
  AclRoles,
  generateQrcodeURL,
  GenearteVendorId
} = require('../utils');
const Pagination = require('../utils/pagination');

class VendorService {
  static searchVendorStore(store_name, extraClause = null) {
    const where = {
      ...extraClause,
      store_name: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('store_name')),
        'LIKE',
        `%${store_name.toLowerCase()}%`
      )
    };

    return Market.findOne({
      where
    });
  }

  static async getAllVendors() {
    return User.findAll({
      where: {
        RoleId: 4
      }
    });
  }

  static async getAllVendorsAdmin() {
    return User.findAll({
      where: {
        RoleId: AclRoles.Vendor
      },
      attributes: userConst.publicAttr,
      include: [
        {
          model: Organisation,
          as: 'Organisations'
        },
        {
          where: {
            transaction_origin: 'store',
            transaction_type: 'spent',
            is_approved: true,
            status: 'success'
          },
          model: Transaction,
          as: 'StoreTransactions'
        }
      ]
    });
  }

  static async addUser(newUser) {
    return User.create(newUser);
  }

  static async updateUser(id, updateUser) {
    try {
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
    } catch (error) {
      throw error;
    }
  }

  static async getVendorData(id) {
    const RoleId = AclRoles.Vendor;
    return User.findOne({
      where: {
        id,
        RoleId
      },
      include: ['Store', 'Wallets', 'Organisations', 'BankAccounts']
    });
  }

  static async getVendor(id, extraClause = null) {
    return User.findOne({
      where: {
        ...extraClause,
        id,
        RoleId: AclRoles.Vendor
      }
    });
  }

  static async getOrganisationVendor(id, OrganisationId) {
    return User.findOne({
      where: {
        id,
        RoleId: AclRoles.Vendor
      },
      attributes: userConst.publicAttr,
      include: [
        {
          model: Organisation,
          as: 'Organisations',
          where: {
            id: OrganisationId
          }
        }
      ]
    });
  }

  static async deleteUser(id) {
    try {
      const UserToDelete = await User.findOne({
        where: {
          id: id
        }
      });

      if (UserToDelete) {
        const deletedUser = await User.destroy({
          where: {
            id: id
          }
        });
        return deletedUser;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
  // Refactor

  static async vendorStoreProducts(vendorId, where = {}) {
    return Product.findAll({
      where,
      include: [
        {
          model: User,
          as: 'ProductVendors',
          attributes: [],
          where: {
            id: vendorId
          }
        }
      ]
    });
  }

  static async createOrder(order, Cart) {
    return Order.create(
      {
        ...order,
        Cart
      },
      {
        include: [
          {
            model: OrderProduct,
            as: 'Cart'
          }
        ]
      }
    );
  }

  static async getOrder(where = {}) {
    const order = await Order.findOne({
      where,
      include: [
        {
          model: User,
          as: 'Vendor',
          attributes: userConst.publicAttr,
          include: ['Store']
        },
        {
          model: OrderProduct,
          as: 'Cart',
          include: ['Product']
        }
      ]
    });

    if (order) {
      const data = order.toJSON();
      const cart_items = order.Cart.length;
      const total_quantity = order.Cart.map(c => c.quantity).reduce(
        (a, b) => a + b,
        0
      );
      const total_cost = order.Cart.map(c => c.total_amount).reduce(
        (a, b) => a + b,
        0
      );
      const QrCode = await generateQrcodeURL({
        CampaignId: data.CampaignId,
        reference: data.reference,
        cart_items,
        total_quantity,
        total_cost,
        vendor: `${data.Vendor.first_name || ''} ${
          data.Vendor.last_name || ''
        }`,
        store: data.Vendor.Store.store_name
      });

      return {order, cart_items, total_quantity, total_cost, QrCode};
    }

    return null;
  }

  static async findVendorStore(UserId) {
    return Market.findOne({
      include: [
        {
          model: User,
          as: 'StoreOwner',
          attributes: [],
          where: {
            id: UserId
          }
        }
      ]
    });
  }

  static async findVendorOrders(VendorId, extraClause = null) {
    return Order.findAll({
      where: {
        ...extraClause,
        VendorId
      },
      include: [
        {
          model: User,
          as: 'Vendor',
          attributes: userConst.publicAttr,
          include: ['Store']
        },
        {
          model: OrderProduct,
          as: 'Cart',
          include: ['Product']
        }
      ],
      order: [['id', 'DESC']]
    });
  }

  static async vendorPublicDetails(id, extraClause = null) {
    const {OrganisationId, ...filter} = extraClause;
    return User.findOne({
      where: {
        id,
        ...filter,
        RoleId: AclRoles.Vendor
      },
      attributes: userConst.publicAttr,

      //     model: Market,
      //     as: 'Store',
      //include: [{model: Product, as: 'ProductVendors'}]

      include: [
        {
          model: Organisation,
          as: 'Organisations',
          through: {
            attributes: []
          },
          where: {
            ...(OrganisationId && {
              id: OrganisationId
            })
          }
        },

        {
          model: Wallet,
          as: 'Wallets',
          attributes: {
            exclude: walletConst.walletExcludes
          },
          include: ['ReceivedTransactions', 'SentTransactions']
        }
      ]
    });
  }

  static async dailyVendorStats(VendorId, date = new Date()) {
    const START = date.setHours(0, 0, 0, 0);
    const END = date.setHours(23, 59, 59);

    return User.findOne({
      where: {
        id: VendorId,
        RoleId: AclRoles.Vendor
      },
      attributes: {
        exclude: Object.keys(User.rawAttributes),
        include: [
          // [Sequelize.fn('SUM', Sequelize.col('StoreTransactions.Order.Cart.total_amount')), 'transactions_value'],
          // [Sequelize.fn('COUNT', Sequelize.col("StoreTransactions.id")), "transactions_count"],
          // [Sequelize.fn('COUNT', Sequelize.col("StoreTransactions.Order.Products.id")), "products_count"],
        ]
      },
      include: [
        {
          attributes: [],
          model: Transaction,
          as: 'StoreTransactions',
          where: {
            createdAt: {
              [Op.gt]: START,
              [Op.lt]: END
            }
          },
          include: [
            {
              model: Order,
              as: 'Order',
              attributes: [],
              where: {
                status: {
                  [Op.in]: ['confirmed', 'delivered']
                }
              },
              include: [
                {
                  attributes: [],
                  model: Product,
                  as: 'Products',
                  through: {
                    attributes: []
                  }
                },
                {
                  model: OrderProduct,
                  as: 'Cart',
                  attributes: []
                }
              ]
            }
          ]
        }
      ]
    });
  }

  static async organisationVendors({id: OrganisationId}) {
    const vendorIds = (
      await OrganisationMembers.findAll({
        where: {
          OrganisationId,
          role: OrgRoles.Vendor
        }
      })
    ).map(m => m.UserId);
    return User.findAll({
      where: {
        id: {
          [Op.in]: [...vendorIds]
        }
      },
      include: ['Wallet', 'Store']
    });
  }

  static async organisationVendorsAdmin(OrganisationId) {
    const vendorIds = (
      await OrganisationMembers.findAll({
        where: {
          OrganisationId,
          role: OrgRoles.Vendor
        }
      })
    ).map(m => m.UserId);
    return User.findAll({
      where: {
        id: {
          [Op.in]: [...vendorIds]
        }
      },
      include: ['Wallet', 'Store']
    });
  }
  static async organisationDailyVendorStat(OrganisationId, date = new Date()) {
    const START = date.setHours(0, 0, 0, 0);
    const END = date.setHours(23, 59, 59);
    return Organisation.findOne({
      where: {
        id: OrganisationId
      },
      attributes: {
        exclude: Object.keys(Organisation.rawAttributes),
        include: [
          [
            Sequelize.fn(
              'SUM',
              Sequelize.col(
                'Vendors->StoreTransactions->Order->Products->OrderProduct.total_amount'
              )
            ),
            'transactions_value'
          ],
          [
            Sequelize.fn(
              'COUNT',
              Sequelize.col('Vendors.StoreTransactions.uuid')
            ),
            'transactions_count'
          ],
          [
            Sequelize.fn(
              'COUNT',
              Sequelize.col('Vendors.StoreTransactions.Order.Products.id')
            ),
            'products_count'
          ],
          [Sequelize.fn('COUNT', Sequelize.col('Vendors.id')), 'vendors_count']
        ]
      },
      include: [
        {
          model: User,
          as: 'Vendors',
          attributes: [],
          include: [
            {
              attributes: [],
              model: Transaction,
              as: 'StoreTransactions',
              where: {
                createdAt: {
                  [Op.gt]: START,
                  [Op.lt]: END
                }
              },
              include: [
                {
                  model: Order,
                  as: 'Order',
                  attributes: [],
                  where: {
                    status: {
                      [Op.in]: ['confirmed', 'delivered']
                    }
                  },
                  include: [
                    {
                      attributes: [],
                      model: Product,
                      as: 'Products',
                      through: {
                        attributes: []
                      }
                    },
                    {
                      model: OrderProduct,
                      as: 'Cart',
                      attributes: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      group: [
        'Organisation.id',
        'Vendors.OrganisationMembers.UserId',
        'Vendors.OrganisationMembers.OrganisationId',
        'Vendors.OrganisationMembers.role',
        'Vendors.OrganisationMembers.createdAt',
        'Vendors.OrganisationMembers.updatedAt'
      ]
    });
  }

  static async organisationVendorsTransactions(OrganisationId, filter = null) {
    return Transaction.findAll({
      where: {
        ...filter,
        transaction_origin: 'store'
      },
      attributes: ['reference', 'amount', 'createdAt', 'updatedAt'],
      include: [
        {
          model: User,
          as: 'Vendor',
          attributes: ['first_name', 'last_name'],
          include: [
            'Store',
            {
              model: Organisation,
              as: 'Organisations',
              attributes: [],
              where: {
                id: OrganisationId
              },
              through: {
                attributes: []
              }
            }
          ]
        },
        {
          model: User,
          as: 'Beneficiary',
          attributes: userConst.publicAttr
        }
      ]
    });
  }

  static async vendorsTransactionsAdmin(VendorId) {
    return Transaction.findAll({
      where: {
        // transaction_origin: 'wallet',
        transaction_type: 'withdrawal'
      },
      attributes: ['reference', 'amount', 'createdAt', 'updatedAt'],
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

  static async uploadVendorEvidence(vendorId) {
    const RoleId = AclRoles.Vendor;
    const exist = User.findAll({
      where: {
        id: vendorId,
        RoleId
      }
    });

    if (!exist) {
      throw new Error('Vendor Not Found');
    } else {
      return;
    }
  }
  static async vendorChart(VendorId, period) {
    return Transaction.findAndCountAll({
      order: [['updatedAt', 'ASC']],
      where: {
        VendorId,
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
        {model: BankAccount, as: 'Bank'},
        {
          model: Wallet,
          as: 'ReceiverWallet',
          attributes: {
            exclude: walletConst.walletExcludes
          }
        },
        {
          model: User,
          as: 'Vendor',
          attributes: userConst.publicAttr
        }
      ]
    });
  }
}

module.exports = VendorService;
