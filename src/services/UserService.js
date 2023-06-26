const {User, BankAccount, OrganisationMembers} = require('../models');
const axios = require('axios');
const Axios = axios.create();
const {AclRoles} = require('../utils');
const {Logger} = require('../libs');
const {userConst} = require('../constants');

class UserService {
  static async createUser(data) {
    return await User.create(data);
  }

  static async getAllUsers() {
    try {
      return await User.findAll({
        attributes: userConst.publicAttr
      });
    } catch (error) {
      throw error;
    }
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
  static async getAUser(id) {
    try {
      const theUser = await User.findOne({
        where: {
          id: id
        }
      });

      return theUser;
    } catch (error) {
      throw error;
    }
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

  // Refactored ==============

  static findUser(id, extraClause = null) {
    return User.findOne({
      where: {
        id,
        ...extraClause
      },
      include: [
        'Store',
        {
          model: OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: ['Organisation']
        }
      ]
    });
  }

  static findByEmail(email, extraClause = null) {
    return User.findOne({
      where: {
        email,
        ...extraClause
      }
    });
  }
  static findByUsername(username, extraClause = null) {
    return User.findOne({
      where: {
        username,
        ...extraClause
      }
    });
  }

  static findByPhone(phone, extraClause = null) {
    return User.findOne({
      where: {
        phone,
        ...extraClause
      }
    });
  }

  static findSingleUser(where) {
    return User.findOne({
      where
    });
  }

  static findBeneficiary(id, OrganisationId = null) {
    return User.findOne({
      where: {
        id,
        RoleId: AclRoles.Beneficiary

        // ...(OrganisationId && {
        //     OrganisationId: Sequelize.where(Sequelize.col('Campaigns.OrganisationId'), OrganisationId)
        // }
        // )
      },
      attributes: userConst.publicAttr
    });
  }

  static update(id, data) {
    return User.update(data, {
      where: {
        id
      }
    });
  }

  static addUserAccount(UserId, data) {
    return BankAccount.create(
      {
        ...data,
        UserId
      },
      {
        include: ['AccountHolder']
      }
    );
  }

  static findUserAccounts(UserId) {
    return BankAccount.findAll({
      where: {
        UserId
      },
      include: {
        model: User,
        as: 'AccountHolder',
        attributes: ['first_name', 'last_name', 'phone', 'dob']
      }
    });
  }

  static async nin_verification(number, country) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Verifying NIN');
        const NG = 'nin_wo_face';
        const KE = 'ke/national_id';
        const {data} = await Axios.post(
          `https://api.myidentitypay.com/api/v2/biometrics/merchant/data/verification/${
            country === 'Nigeria' ? NG : KE
          }`,
          number,
          {
            headers: {
              'x-api-key': ` ${process.env.IDENTITY_API_KEY}`,
              'app-id': process.env.IDENTITY_APP_ID
            }
          }
        );
        data.status
          ? Logger.info('NIN verified')
          : Logger.info(`${data.message}`);
        resolve(data);
      } catch (error) {
        Logger.error(`Error Verifying NIN: ${error}`);
        reject(error);
      }
    });
  }
}

module.exports = UserService;
