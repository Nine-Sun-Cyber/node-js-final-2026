const { dataSource } = require("../db/data-source");
const isValidString = (value) => typeof value === 'string' && value.trim().length > 0;
const appError = require("../utils/appError");
const { isInteger } = require("../utils/validUtils");

const creditPackageController={
    
    //成功取得方案列表（還沒有任何方案時回空陣列 []，不是錯誤）
    async getCreditPkg(req, res, next){
        const creditPackage = await dataSource.getRepository('CreditPackage').find({
            select :{ id: true, name: true, credit_amount: true, price: true},
        });
        res.json({
            status: 'success',
            data: creditPackage,
        });
        return ;
    },
    
    
    async postCreditPkg(req, res, next){
        const {name, credit_amount, price} = req.body;
        
        //任一欄位沒給；name 不是字串或為空；credit_amount 或 price 不是數字、是負數、或帶小數
        if (!isValidString(name) || !isInteger(credit_amount) || !isInteger(price)){
            next(appError(400, '欄位未填寫正確'));
            return;
        }

        const creditPackageRepo = dataSource.getRepository('CreditPackage');
        const findCreditPackage = await creditPackageRepo.findOneBy({name: name.trim()});

        if(findCreditPackage){
            next(appError(409, '資料重複'));
            return;
        }

        const newCreditPackage = await creditPackageRepo.save({name: name.trim(),credit_amount, price});
        res.json({
            status: 'success',
            data: newCreditPackage,
        });
        return ;
    },

    async deleteCreditPkg(req, res, next){
        const {creditPackageId} = req.params;
        const result = await dataSource.getRepository('CreditPackage').delete(creditPackageId);

        if(result.affected ===0 ){
            next(appError(400, 'ID錯誤'));
            return;
        }

        res.json({
            status: 'success',
        });
    },

    async purchase(req, res, next){
        const { creditPackageId } = req.params;
        const repo = dataSource.getRepository('CreditPackage');
        const findPackage = await repo.findOneBy({ id: creditPackageId });

        if(!findPackage){
            next(appError(400, 'ID錯誤'));
            return;
        }

        const purchaseRepo = dataSource.getRepository('CreditPurchase');
        await purchaseRepo.save({
            user_id: req.user.id,
            credit_package_id: findPackage.id,
            purchased_credits: findPackage.credit_amount,
            price_paid: findPackage.price,
        })

        res.json({
            status: 'success',
            data: null
        });
    },

};

module.exports = creditPackageController;