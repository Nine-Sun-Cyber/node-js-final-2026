const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dataSource } = require("../db/data-source");
const config = require('../config/index');
const appError = require("../utils/appError");
const {isValidString, isValidPassword} = require('../utils/validUtils');

const PWD_ERR = '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字';


const usersController={
    async signup(req, res, next){
        const {name, email, password} = req.body;
        if (!isValidString(name) || !isValidString(email) ||  !isValidString(password)){
                next(appError(400, '欄位未填寫正確'));
                return;
        }
            
        if(!isValidPassword(password)){
            next(appError(400, PWD_ERR));
            return;
        }
        
        const userRepo = dataSource.getRepository('User');
        const userExist = await userRepo.findOneBy({email: email.trim().toLowerCase(),});
            
        if(userExist){
            next(appError(409, "Email 已被使用"));
            return;
        }

        const hashed = await bcrypt.hash(password, 10);
        const newUser = await userRepo.save({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password: hashed,
                role: 'USER',
        });

        res.status(201).json({
                status: 'success',
                data: { user: { id: newUser.id, name: newUser.name }},
        });

    },
    
    async login(req, res, next){
        const {email, password} = req.body;
        if (!isValidString(email) ||  !isValidString(password)){
                next(appError(400, '欄位未填寫正確'));
                return;
        }
            
        if(!isValidPassword(password)){
            next(appError(400, PWD_ERR));
            return;
        }
        
        const userRepo = dataSource.getRepository('User');
        const userExist = await userRepo.findOneBy({email: email.trim().toLowerCase(),});
        if(!userExist) {
            next(appError(400, '使用者不存在或密碼輸入錯誤'));
            return;
        }

        const isMatch = await bcrypt.compare( password, userExist.password);
        if(!isMatch){
            next(appError(400, '使用者不存在或密碼輸入錯誤'));
            return;
        }

        const token = jwt.sign(
            { id: userExist.id, role: userExist.role},
            config.get('secret.jwtSecret'),
            {expiresIn: config.get('secret.jwtExpiresDay'), },
      );
      
      res.status(201).json({
        status: 'success',
        data: { token, user: {name: userExist.name}},
      });
    },

    async getProfile(req, res, next){
        res.json({
            status: "success",
            data: { user: { name: req.user.name, email: req.user.email } },
        });
    },

    async putProfile(req, res, next){
        if (!req.user || !req.user.id) {
            next(appError(401, '請先登入'));
            return;
        };
        
        const {name} = req.body;
        if (!isValidString(name)){
                next(appError(400, '欄位未填寫正確'));
                return;
        };

        const userRepo = dataSource.getRepository('User');
        await userRepo.update(req.user.id, {name: name.trim(),});
        const updatedUser = await userRepo.findOneBy({ id: req.user.id });
        res.status(200).json({
            status: 'success',
            data: { user: {name: updatedUser.name, email: updatedUser.email,} },
        });
    },


    async putPassword(req, res, next) {
        const { password, new_password, confirm_new_password} = req.body;
        
        //檢查空字串,缺漏
        if (!isValidString(password) || !isValidString(new_password) || !isValidString(confirm_new_password)) {
            next(appError(400, '欄位未填寫正確'));
            return;
        }

        //檢查三欄不符合密碼規則
        if(!isValidPassword(password) || !isValidPassword(new_password) || !isValidPassword(confirm_new_password)){
            next(appError(400, PWD_ERR));
            return;
        }

        //檢查新密碼和舊密碼不一樣
        if(password === new_password){
            next(appError(400, '新密碼不能與舊密碼相同'));
            return;
        }

        //新密碼與再次確認的密碼不一致
        if( new_password !== confirm_new_password){
            next(appError(400, '新密碼與驗證新密碼不一致'));
            return;
        }

        const userRepo = dataSource.getRepository('User');
        const findUser = await userRepo.findOneBy({id: req.user.id});

        //舊密碼比對
        const isMatch = await bcrypt.compare(password, findUser.password);
        if (!isMatch){
            next(appError(400, '密碼輸入錯誤'));
            return;
        }

        //儲存新密碼
        const newHashed = await bcrypt.hash(new_password, 10);
        await userRepo.update( { id: req.user.id} , { password: newHashed });

        res.status(200).json({
            status: 'success',
            data: null,
        })

    },

    async getCreditPackage(req, res, next) {
        try{
            const purchaseRepo = dataSource.getRepository('CreditPurchase');
            const usersPurchase = await purchaseRepo.find({
                where: { user_id: req.user.id},
                relations: { creditPackage: true },
                order: { created_at: 'DESC'}
            });

            const data = usersPurchase.map((p) =>({
                name: p.creditPackage.name ,
                purchased_credits: p.purchased_credits ,
                price_paid: p.price_paid,
                purchase_at: p.created_at
            }));
            
            res.status(200).json({
                status: 'success',
                data,
            });

        }catch(error){
            next(appError(500, '伺服器錯誤'));
        }
        
    },

    async getCourses(req, res, next) {
        try{

            const purchaseRepo = dataSource.getRepository('CreditPurchase');
            const bookingRepo = dataSource.getRepository('CourseBooking');

            //購買堂數加總
            const purchases = await purchaseRepo.findBy({ user_id: req.user.id });
            const totalPurchased = purchases.reduce((sum, p) => sum + p.purchased_credits, 0);

            //購買紀錄
            const bookings = await bookingRepo.find({
                where: { user_id: req.user.id },
                relations: { course: { user: true }},
                order: { course: { start_at: 'ASC '}}
            });

            //未取消的報名數
            const activeCount = bookings.filter((b) => b.cancelled_at === null ).length;
            const creditRemain = totalPurchased - activeCount;
            const creditUsage = activeCount;

            const courseBooking = bookings.map((b) => ({
                course_id: b.course.id,
                name: b.course.name,
                start_at: b.course.start_at,
                end_at: b.course.end_at,
                meeting_url: b.course.meeting_url,
                coach_name: b.course.user.name,
                cancelled_at: b.cancelled_at
            }));

            res.status(200).json({
                status: 'success',
                data : {
                    credit_remain: creditRemain,
                    credit_usage: creditUsage,
                    course_booking: courseBooking
                }
            })

        }catch(error){
            next(appError(500, '伺服器錯誤'));
        }
    },

};

module.exports = usersController;