"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Wallets", {
      uuid: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      privateKey: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      bantuAddress: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      bantuPrivateKey: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      CampaignId: {
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: "Campaigns",
          },
          key: "id",
        },
      },
      AccountUserId: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      AccountUserType: {
        type: Sequelize.STRING,
      },
      balance: {
        allowNull: false,
        type: Sequelize.FLOAT,
        defaultValue: 0.0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Wallets");
  },
};
