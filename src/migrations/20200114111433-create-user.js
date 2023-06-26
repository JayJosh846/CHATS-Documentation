'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {

      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      referal_id: {
        type: Sequelize.STRING,
      },
      RoleId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'Roles',
          },
          key: 'id'
        }
      },
      first_name: {
        type: Sequelize.STRING
      },
      last_name: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING,
        unique: true
      },
      phone: {
        type: Sequelize.STRING
      },
      password: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('suspended', 'activated', 'pending'),
        defaultValue: 'pending'
      },
      marital_status: {
        type: Sequelize.STRING
      },
      gender: {
        type: Sequelize.STRING
      },
      location: {
        type: Sequelize.STRING
      },
      bvn: {
        type: Sequelize.STRING
      },
      nin: {
        type: Sequelize.STRING,
        unique: true
      },
      pin: {
        type: Sequelize.STRING
      },
      address: {
        type: Sequelize.STRING
      },
      is_email_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_phone_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_bvn_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_self_signup: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_tfa_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      tfa_secret: {
        type: Sequelize.STRING
      },
      last_login: {
        type: Sequelize.DATE
      },
      profile_pic: {
        type: Sequelize.STRING
      },
      dob: {
        type: Sequelize.DATE
      },
      nfc: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Users');
  }
};
