const router = require('express').Router();

const {
  VendorController,
  AuthController,
  OrderController,
  OrganisationController
} = require('../controllers');
const {
  Auth,
  VendorAuth,
  NgoSubAdminAuth,
  IsOrgMember,
  BeneficiaryAuth,
  IsRequestWithValidPin
} = require('../middleware');
const {ParamValidator, FileValidator} = require('../validators');
const VendorValidator = require('../validators/VendorValidator');

router.get('/', VendorController.getAllVendors);
router.get('/chart/:period', VendorAuth, VendorController.vendorChart);
router.post('/add-account', VendorController.addAccount);
router.get('/stores/all', VendorController.getAllStores);
router.get('/store/:id', VendorController.getVendorStore);
router.get('/accounts/all', VendorController.getAccounts);
router.get(
  '/products/all/:organisation_id',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  OrderController.productPurchased
);
router.post('/product', VendorController.addProduct);
router.get('/products/single/:id', VendorController.singleProduct);
router.get('/products/value', VendorController.getProductsValue);
router.get('/products/sold/value', VendorController.getSoldProductValue);
router.get('/store/products/:storeId', VendorController.getProductByStore);
router.get('/summary/:id', VendorController.getSummary);
router.post('/auth/login', AuthController.signInVendor);
router.post(
  '/verify/sms-token/:smstoken',
  VendorAuth,
  VendorController.verifySMStoken
);
router.get('/product_vendors', OrganisationController.ProductVendors);

router.post(
  '/profile/upload',
  VendorAuth,
  VendorValidator.VendorExists,
  FileValidator.checkProfilePic(),
  VendorController.uploadprofilePic
);

router
  .route('/products')
  .get(
    VendorAuth,
    VendorValidator.VendorExists,
    VendorController.vendorProducts
  );

router
  .route('/campaigns')
  .get(
    VendorAuth,
    VendorValidator.VendorExists,
    VendorController.vendorCampaigns
  );

router
  .route('/campaigns/:campaign_id/products')
  .get(
    VendorAuth,
    ParamValidator.CampaignId,
    VendorValidator.VendorExists,
    VendorController.vendorCampaignProducts
  );

router
  .route('/orders')
  .get(VendorAuth, VendorController.getVendorOrders)
  .post(
    VendorAuth,
    VendorValidator.VendorExists,
    VendorValidator.VendorApprovedForCampaign,
    VendorValidator.createOrder,
    VendorController.createOrder
  );

router
  .route('/orders/:order_id')
  .get(VendorAuth, ParamValidator.OrderId, VendorController.getOrderById);

router.route('/orders/:id/pay').post();

router.get('/me', VendorAuth, VendorController.getVendor);

router.get('/:id', Auth, VendorController.getVendor);

module.exports = router;
