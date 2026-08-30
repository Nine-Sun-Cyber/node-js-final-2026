const { DataSource } = require("typeorm");
const config = require("../config/index");

const dataSource = new DataSource({
  type: "postgres",
  host: config.get("db.host"),
  port: Number(config.get("db.port")),
  username: config.get("db.username"),
  password: config.get("db.password"),
  database: config.get("db.database"),
  synchronize: config.get("db.synchronize"),
  ssl: config.get("db.ssl"),
  entities: [
    require("../entities/User"),
    require("../entities/Skill"),
    require("../entities/Coach"),
    require("../entities/Course"),
    require("../entities/CoachLinkSkill"),
    require("../entities/CourseBooking"),
    require("../entities/CreditPackage"),
    require("../entities/CreditPurchase")
  ],
});

module.exports = { dataSource };