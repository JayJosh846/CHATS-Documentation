const router = require('express').Router();

const AuthCtrl = require('../controllers/VendorsAuthController');

router.post('/register', AuthCtrl.createUser);
router.post('/login', AuthCtrl.signIn);
router.post('/reset-password', AuthCtrl.resetPassword);
router.post('/update-password', AuthCtrl.updatePassword);
router.post('/update-profile', AuthCtrl.updateProfile);
router.get('/user-detail/:id', AuthCtrl.userDetails);

module.exports = router;
