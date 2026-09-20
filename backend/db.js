const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
    port: Number(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER || "3eYD2XSDHAosooa.rootcd..",
    password: process.env.DB_PASSWORD || "18YKKspFBceLVM4G",
    database: process.env.DB_NAME || "citycare_hospital",
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
    ssl: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: false
    }
});

async function initDatabase() {
    const schema = fs.readFileSync(
        path.join(__dirname, "schema.sql"),
        "utf8"
    );

    const statements = schema
        .split(/;\s*(?:\r?\n|$)/)
        .map((statement) => statement.trim())
        .filter(Boolean);

    for (const statement of statements) {
        await pool.query(statement);
    }

    const migrations = [
        [
            "doctors",
            "qualification",
            "ALTER TABLE doctors ADD COLUMN qualification VARCHAR(180) AFTER specialization"
        ],
        [
            "doctors",
            "experience",
            "ALTER TABLE doctors ADD COLUMN experience DECIMAL(5,1) AFTER qualification"
        ],
        [
            "departments",
            "contact_number",
            "ALTER TABLE departments ADD COLUMN contact_number VARCHAR(20) AFTER head_doctor"
        ],
        [
            "departments",
            "location",
            "ALTER TABLE departments ADD COLUMN location VARCHAR(150) AFTER contact_number"
        ],
        [
            "departments",
            "status",
            "ALTER TABLE departments ADD COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active' AFTER location"
        ],
        [
            "patients",
            "emergency_name",
            "ALTER TABLE patients ADD COLUMN emergency_name VARCHAR(150) AFTER pincode"
        ],
        [
            "patients",
            "emergency_mobile",
            "ALTER TABLE patients ADD COLUMN emergency_mobile VARCHAR(20) AFTER emergency_name"
        ],
        [
            "patients",
            "emergency_relationship",
            "ALTER TABLE patients ADD COLUMN emergency_relationship VARCHAR(50) AFTER emergency_mobile"
        ],
        [
            "patients",
            "allergies",
            "ALTER TABLE patients ADD COLUMN allergies VARCHAR(255) AFTER emergency_relationship"
        ],
        [
            "patients",
            "preferred_department",
            "ALTER TABLE patients ADD COLUMN preferred_department VARCHAR(100) AFTER allergies"
        ],
        [
            "patients",
            "preferred_doctor",
            "ALTER TABLE patients ADD COLUMN preferred_doctor VARCHAR(150) AFTER preferred_department"
        ]
    ];

    for (const [table, column, statement] of migrations) {
        const [columns] = await pool.query(
            `SELECT COUNT(*) AS count
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ?
             AND TABLE_NAME = ?
             AND COLUMN_NAME = ?`,
            ["citycare_hospital", table, column]
        );

        if (!columns[0].count) {
            await pool.query(statement);
        }
    }
}

module.exports = {
    pool,
    initDatabase
};