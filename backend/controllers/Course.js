const { dataSource } = require('../db/data-source');
const { IsNull } = require('typeorm');
const appError = require('../utils/appError');

const courseController = {
    async bookCourse(req, res, next){
        const { courseId } = req.params;
        const courseRepo = dataSource.getRepository('Course');
        const bookingRepo = dataSource.getRepository('CourseBooking');
        const purchaseRepo = dataSource.getRepository('CreditPurchase');

        //檢查課程是否存在
        const findCourse = await courseRepo.findOneBy({ id: courseId });
        if(!findCourse){
            next(appError(400, 'ID錯誤'));
            return;
        }

        //檢查課程報名紀錄
        const findBooking = await bookingRepo.findOneBy({
            user_id: req.user.id,
            course_id: courseId
        });

        if(findBooking){
            next(appError(400, '已經報名過此課程'));
            return;
        }

        //檢查剩餘堂數歸零(購買加總-未取消報名 <=0 )=沒有可使用的堂數
        const purchases = await purchaseRepo.findBy({ user_id: req.user.id });
        const totalPurchased = purchases.reduce((sum, p) => sum + p.purchased_credits, 0 );
        
        const activeBookings = await bookingRepo.findBy({
            course_id: courseId,
            cancelled_at: IsNull()
        });

        const creditRemain = totalPurchased - activeBookings;
        if(creditRemain <= 0){
            next(appError(400, '已無可使用堂數'));
            return;
        }

        //課程人數是否達到上限
        const bookingsOfCourse = await bookingRepo.findBy({
            course_id: courseId,
            cancelled_at: IsNull()
        })

        if(bookingsOfCourse.length >= findCourse.max_participants){
            next(appError(400, '已達最大參加人數，無法參加'));
            return;
        }

        // 建立報名紀錄
        await bookingRepo.save({
            user_id: req.user.id,
            course_id:courseId
        });

        res.status(201).json({
            status: 'success',
            data: null
        });
    },

    async deletebooking(req, res, next){
        const { courseId } = req.params;
        const bookingRepo = dataSource.getRepository('CourseBooking');

        //課程不存在、從未報名、已取消過 —— 查不到就是同一句錯誤
        const findBooking = await bookingRepo.findOneBy({
            user_id: req.user.id,
            course_id: courseId,
            cancelled_at: IsNull(),
        });

        if (!findBooking) {
            next(appError(400, '找不到可取消的報名紀錄'));
            return;
        }
        
        await bookingRepo.update(
            { id: findBooking.id },
            { cancelled_at: new Date() }
        );
        
        res.status(200).json({
            status: 'success',
            data: null
        });
    },

    async getOngoingCourses(req, res, next) {
        try {
            const courseRepo = dataSource.getRepository('Course');
            const now = new Date();
            const courses = await courseRepo.find({
                relations: { user: true, skill: true },
            });

            const data = courses
                 .filter((c) => new Date(c.start_at) <= now && now < new Date(c.end_at))
                 .map((c) => ({
                    id: c.id,
                    name: c.name,
                    description: c.description,
                    start_at: c.start_at,
                    end_at: c.end_at,
                    max_participants: c.max_participants,
                    coach_name: c.user.name,
                    skill_name: c.skill.name,
                }));
                
                res.status(200).json({
                    status: 'success',
                    data,
                });
            } catch (error) {
                next(appError(500, '伺服器錯誤'));
                return;
            }
        },

    };

module.exports = courseController;