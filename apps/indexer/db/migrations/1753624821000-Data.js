module.exports = class Data1753624821000 {
  name = "Data1753624821000";

  async up(db) {
    // 1. drop the candidate_id column from the vote table
    await db.query(`ALTER TABLE vote DROP COLUMN candidate_id;`);

    // 2. drop the index column from the vote table
    await db.query(`ALTER TABLE vote DROP COLUMN index;`);
  }

  async down(db) {
    // 1. add the candidate_id column to the vote table
    await db.query(`ALTER TABLE vote ADD COLUMN candidate_id int4;`);

    // 2. add the index column to the vote table
    await db.query(`ALTER TABLE vote ADD COLUMN index int4;`);
  }
};
