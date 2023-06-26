const router = require('express').Router();

const {
  Auth,
  VendorAuth,
  VendorBeneficiaryAuth,
  BeneficiaryAuth
} = require('../middleware/auth');
const UsersController = require('../controllers/UsersController');
const {UserValidator} = require('../validators');
const {IsUserVerified} = require('../middleware');

// Refactored

router.post(
  '/account/:amount/withdraw/:accountno/:campaignId',
  BeneficiaryAuth,
  UsersController.beneficiaryWithdrawFromBankAccount
);
router.post(
  '/account/:amount/withdraw/:accountno',
  VendorAuth,
  UsersController.vendorWithdrawFromBankAccount
);

router.post('/support', UsersController.createTicket);

router
  .route('/pin')
  .put(
    Auth,
    UserValidator.updatePinRules(),
    UserValidator.validate,
    UsersController.updateAccountPin
  )
  .post(
    Auth,
    UserValidator.setPinRules(),
    UserValidator.validate,
    UsersController.setAccountPin
  );

router
  .route('/password')
  .put(
    Auth,
    UserValidator.updatePasswordRules(),
    UserValidator.validate,
    UsersController.changePassword
  );

router
  .route('/accounts')
  .get(VendorBeneficiaryAuth, UsersController.getUserAccouns)
  .post(
    VendorBeneficiaryAuth,
    IsUserVerified,
    UserValidator.addAccountValidation,
    UsersController.addBankAccount
  );

router
  .route('/profile')
  .get(Auth, UsersController.findProfile)
  .put(
    Auth,
    UserValidator.updateProfileValidation,
    UsersController.updateProfile
  );

router.get('/', Auth, UsersController.getAllUsers);
router.post('/', Auth, UsersController.addUser);
router.get('/:id', Auth, UsersController.getAUser);

router.put('/profile-image', Auth, UsersController.updateProfileImage);
router.put('/nfc_update', Auth, UsersController.updateNFC);
router.delete('/:id', UsersController.deleteUser);
router.get(
  '/transactions/:beneficiary',
  Auth,
  UsersController.getBeneficiaryTransactions
);
router.get(
  '/recent_transactions/:beneficiary',
  Auth,
  UsersController.getRecentTransactions
);
router.get('/transaction/:uuid', Auth, UsersController.getTransaction);
router.get(
  '/transactions/recieved/:id',
  Auth,
  UsersController.getTotalAmountRecieved
);
router.post('/transact', Auth, UsersController.transact);
router.get('/info/statistics', Auth, UsersController.getStats);
router.get('/info/chart', Auth, UsersController.getChartData);
router.get('/info/wallet-balance/:id', Auth, UsersController.getWalletBalance);
router.post('/product/cart', Auth, UsersController.addToCart);
router.get('/cart/:userId', Auth, UsersController.getCart);
router.post('/cart/checkout', Auth, UsersController.checkOut);
router.get('/types/count', Auth, UsersController.countUserTypes);
router.post('/reset-password', UsersController.resetPassword);
router.post('/update-password', Auth, UsersController.updatePassword);
router.post('/update-pin', Auth, UsersController.updatePin);
router.get('/financials/summary/:id', Auth, UsersController.getSummary);
router.get('/pending/orders/:userId', Auth, UsersController.fetchPendingOrder);
router.post('/action/deactivate', Auth, UsersController.deactivate);

module.exports = router;
