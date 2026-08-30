const creditPackageController = require('../controllers/CreditPackage');
const router = require('express').Router();

const isAuth = require('../middlewares/isAuth');

//M1
router.get('/', creditPackageController.getCreditPkg);
router.post('/', creditPackageController.postCreditPkg);
router.delete('/:creditPackageId', creditPackageController.deleteCreditPkg);

//M5
router.post('/:creditPackageId', isAuth, creditPackageController.purchase);

module.exports = router;