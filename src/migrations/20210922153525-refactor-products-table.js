'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Products', 'name');
    await queryInterface.removeColumn('Products', 'quantity');
    await queryInterface.removeColumn('Products', 'price');
    await queryInterface.addColumn('Products', 'type', {
      type: Sequelize.ENUM('product', 'service', 'item'),
      after: 'id'
    });
    await queryInterface.addColumn('Products', 'tag', {
      type: Sequelize.STRING,
      after: 'type'
    });

    await queryInterface.addColumn('Products', 'cost', {
      type: Sequelize.FLOAT,
      after: 'tag'
    });

    await queryInterface.addColumn('Products', 'CampaignId', {
      after: 'MarketId',
      allowNull: false,
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Campaigns'
        },
        key: 'id'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Products', 'type');
    await queryInterface.removeColumn('Products', 'tag');
    await queryInterface.removeColumn('Products', 'cost');
    await queryInterface.removeColumn('Products', 'CampaignId');
    await queryInterface.addColumn('Products', 'name', {
      type: Sequelize.STRING
    });
    await queryInterface.addColumn('Products', 'quantity', {
      type: Sequelize.INTEGER
    });
    await queryInterface.addColumn('Products', 'price', {
      type: Sequelize.FLOAT
    });
  }
};
