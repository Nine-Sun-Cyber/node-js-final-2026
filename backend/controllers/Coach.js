const { dataSource } = require("../db/data-source");
const config = require('../config/index');
const appError = require("../utils/appError");
const { isInteger, isValidString } = require("../utils/validUtils");
const CoachLinkSkill = require("../entities/CoachLinkSkill");



const coachController={
    async postCoach(req, res, next){
        const {userId} = req.params;
        const {experience_years, description, profile_image_url } = req.body;

        //1.驗證欄位
        if ( 
            !isInteger(experience_years) || 
            experience_years <0 || 
            !isValidString(description) || 
            (profile_image_url && !profile_image_url.startsWith('https'))
        ){
            next(appError(400, '欄位未填寫正確'));
            return;
        };
        
        const userRepo = dataSource.getRepository('User');
        const coachRepo = dataSource.getRepository('Coach');

        //2.使用者是否存在
        const findUser = await userRepo.findOneBy({ id: userId});
        if(!findUser){
            next(appError(400, '使用者不存在'));
            return;
        }
        
        //3.是否重複升級
        const findCoach = await coachRepo.findOneBy({ user_id: userId});
        if(findCoach){
            next(appError(409, '使用者已經是教練'));
            return;
        }

        //4.新增教練資料
        const newCoach = await coachRepo.save({
            user_id: userId,
            experience_years,
            description : description || null,
            profile_image_url: profile_image_url || null
        });

        //5.更新user role
        await userRepo.update({ id:userId }, { role: 'COACH' });
        const updateUser = await userRepo.findOneBy({ id: userId });

        res.status(201).json({
            status: 'success',
            data:{
                user:{
                    id: updateUser.id,
                    name: updateUser.name,
                    role: updateUser.role,
                },
            },
        });
    },


    async getCoach(req, res, next){
        const coachRepo = dataSource.getRepository('Coach');
        const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill');
        const findCoach = await coachRepo.findOneBy({ user_id: req.user.id});
        
        const links = await coachLinkSkillRepo.findBy({ coach_id: findCoach.id });
        const skill_ids = links.map((link) => link.skill_id );
        
        
        res.status(200).json({
            status: 'success',
            data:{
                id: findCoach.id,
                experience_years: findCoach.experience_years,
                description: findCoach.description,
                profile_image_url: findCoach.profile_image_url,
                skill_ids,
            },
        });
    },

    async putCoach(req, res, next){
      try{
            const {experience_years, description, profile_image_url, skill_ids } = req.body;

        //1.驗證欄位
        if ( 
            !isInteger(experience_years) || 
            experience_years <0 || 
            !isValidString(description) || 
            !isValidString(profile_image_url) ||
            !profile_image_url.startsWith('https') ||
            !Array.isArray(skill_ids) ||
            skill_ids.length ===0 ||
            skill_ids.some((id) => !isValidString(id))
        ){
            next(appError(400, '欄位未填寫正確'));
            return;
        };

        const coachRepo = dataSource.getRepository('Coach');
        const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill');

        const findCoach= await coachRepo.findOneBy( { user_id: req.user.id });

       //1. 更新Coach基本資料
        await coachRepo.update(
            { id: findCoach.id },
            { experience_years, description, profile_image_url}
        );

        //2.刪除舊技能關聯
        await coachLinkSkillRepo.delete({ coach_id : findCoach.id });
        
        //3. 依照新的skill_ids重新建立關聯
        const newLinks = skill_ids.map((skill_id) => ({
            coach_id: findCoach.id,
            skill_id,
        }));
        await coachLinkSkillRepo.save(newLinks);

        //4.重新查一次更新後的資料回傳
        const updatedCoach = await coachRepo.findOneBy( { id: findCoach.id });

        
        res.status(200).json({
            status: 'success',
            data:{
                id : updatedCoach.id,
                experience_years: updatedCoach.experience_years,
                description: updatedCoach.description,
                profile_image_url: updatedCoach.profile_image_url,
                skill_ids,
            },
        });
    }catch(error){
        next(appError(500, '伺服器錯誤'));
    }
    },

    async getAllCoach(req, res, next){
        const { per, page } = req.query;

        if(
            !per || 
            !page || 
            !/^\d+$/.test(per) ||  
            !/^\d+$/.test(page)
        ){
            next(appError(400, '欄位未填寫正確'));
            return;
        }

        const perNum = parseInt(per, 10);
        const pageNum = parseInt(page, 10);

        const coachRepo = dataSource.getRepository('Coach');

        const coaches = await coachRepo.find({
            relations: { user: true },
            take: perNum,
            skip:(pageNum -1)*perNum
        });

        const data = coaches.map((c) => ({
            id: c.id,
            user_id: c.user_id,
            name: c.user.name
        }));

        
        res.status(200).json({
            status: 'success',
            data
        });
    },

    async getCoachDetail(req, res, next){
        const { coachId } = req.params;

        // coachId為空或是無效字串
        if (!isValidString(coachId)){
            next(appError(400, '欄位未填寫正確'));
            return;
        }

        const coachRepo = dataSource.getRepository('Coach');
        const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill');
        const skillRepo = dataSource.getRepository('Skill');

        const findCoach = await coachRepo.findOne({
            where: { id: coachId },
            relations: { user: true }
        });

        if(!findCoach){
            next(appError(400, '找不到該教練'));
            return;
        }

        const links = await coachLinkSkillRepo.findBy({coach_id: findCoach.id});
        const skillIds = links.map((l) => l.skill_id);

        let skills = [];
        if(skillIds.length >0 ){
            const skilllist = await skillRepo.find({
                where:skillIds.map((id) => ({id}))
            });

            skills = skilllist.map((s) => s.name);
        }

        res.status(200).json({
            status: 'success',
            data: {
                user: { 
                    name: findCoach.user.name, 
                    role: findCoach.user.role
                },
                coach: {
                    id: findCoach.id,
                    user_id: findCoach.user_id,
                    experience_years: findCoach.experience_years,
                    description: findCoach.description,
                    profile_image_url: findCoach.profile_image_url,
                    created_at: findCoach.created_at,
                    updated_at: findCoach.updated_at,
                    skills
                }
            },
        });
    },

    async getCoachCourses(req, res, next){
        try{
            const { coachId } = req.params;
        
            //檢查coachId為空或是無效字串
            if (!isValidString(coachId)) {
                next(appError(400, '欄位未填寫正確'));
                return;
            }

            const coachRepo = dataSource.getRepository('Coach');
            const courseRepo = dataSource.getRepository('Course');
            const findCoach = await coachRepo.findOneBy({ id: coachId });

            // 合法uuid但查無數據
            if (!findCoach) {
                next(appError(400, '找不到該教練'));
                return;
            }

            const now = new Date();
            const courses = await courseRepo.find({
                where: { user_id: findCoach.user_id},
                relations: { user: true, skill: true }
            });

            //end_at > now
            const data = courses
                 .filter((cr) => new Date(cr.end_at) > now )
                 .map((cr) => ({
                    id: cr.id,
                    name: cr.name,
                    description: cr.description,
                    start_at: cr.start_at,
                    end_at: cr.end_at,
                    max_participants: cr.max_participants,
                    coach_name: cr.user.name,
                    skill_name: cr.skill.name,
                }));
                res.status(200).json({
                    status: 'success',
                    data
                });
            }catch(error){
                next(appError(500, '伺服器錯誤'));
                return;
            }
    },

    async getRevenue(req, res, next) {
        
        try{
            const { month } = req.query;
            const MONTH_NAMES = [
                'january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december',
            ];
        
            const monthIndex = MONTH_NAMES.indexOf(month);
            if (!month || monthIndex === -1) {
                next(appError(400, '欄位未填寫正確'));
                return;
            }
        
            const currentYear = new Date().getFullYear();
            const startDate = new Date(currentYear, monthIndex, 1);
            const endDate = new Date(currentYear, monthIndex + 1, 1); 
            
            // 算方案的單堂均價
            const packageRepo = dataSource.getRepository('CreditPackage');
            const packages = await packageRepo.find();

            let totalPrice = 0;
            let totalCredits = 0;
            packages.forEach((pkg) => {
                totalPrice += Number(pkg.price);
                totalCredits += Number(pkg.credit_amount);
            });
        
            const perCreditPrice = totalCredits > 0 ? totalPrice / totalCredits : 0;

            // 查這個教練「該月」「未取消」的報名紀錄
            const bookingRepo = dataSource.getRepository('CourseBooking');
            const bookings = await bookingRepo
              .createQueryBuilder('booking')
              .innerJoin('Course', 'course', 'course.id = booking.course_id')
              .where('course.user_id = :userId', { userId: req.user.id })
              .andWhere('booking.cancelled_at IS NULL')
              .andWhere('booking.created_at >= :startDate', { startDate })
              .andWhere('booking.created_at < :endDate', { endDate })
              .getMany();

            const courseCount = bookings.length;
            const participants = bookings.length;
            const revenue = Math.floor(courseCount * perCreditPrice);
            
            res.status(200).json({
                status: 'success',
                data: {
                    total: {
                        revenue, participants, course_count: courseCount,
                    },
                },
            });
        }catch(error){
            next(appError(500, '伺服器錯誤'));
            return;
        }
    }, 

};

module.exports = coachController;