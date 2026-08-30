const { dataSource } = require('./db/data-source');

async function main() {
    await dataSource.initialize();
    console.log('資料庫連線成功');

    const coachRepo = dataSource.getRepository('Coach');
    const skillRepo = dataSource.getRepository('Skill');
    const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill');

    // 1. 印出資料庫裡「真的存在」的一筆 Coach 和一筆 Skill
    const anyCoach = await coachRepo.find({ take: 1 });
    const anySkill = await skillRepo.find({ take: 1 });

    console.log('--- 資料庫裡現有的 Coach ---');
    console.log(anyCoach);
    console.log('--- 資料庫裡現有的 Skill ---');
    console.log(anySkill);

    if (anyCoach.length === 0 || anySkill.length === 0) {
        console.log('資料庫裡沒有 Coach 或 Skill 資料，請先透過 API 建立至少一筆再執行這個 script');
        process.exit(1);
    }

    // 2. 直接用這兩筆真實存在的資料，嘗試寫入 coach_link_skill
    try {
        const result = await coachLinkSkillRepo.save({
            coach_id: anyCoach[0].id,
            skill_id: anySkill[0].id,
        });
        console.log('--- 寫入成功 ---');
        console.log(result);
    } catch (err) {
        console.log('--- 寫入失敗 ---');
        console.log(err.message);
    }

    process.exit(0);
}

main();