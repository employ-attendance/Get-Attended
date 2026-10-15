-- ============================================================
-- Get-Attendend : MySQL Schema (single Admin + Employees + Records)
-- Import: phpMyAdmin > Import OR mysql -u root -p attend < db.sql
-- ============================================================
CREATE DATABASE IF NOT EXISTS attend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE attend;

-- ---------- 1) ADMIN (sirf 1 row, id='admin' default) ----------
CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR(50) PRIMARY KEY,
  pass VARCHAR(100) NOT NULL,
  mob VARCHAR(15) DEFAULT '',
  movie VARCHAR(100) DEFAULT '',
  birth VARCHAR(100) DEFAULT '',
  school VARCHAR(150) DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO admins (id, pass, mob, movie, birth, school)
VALUES ('admin', 'Admin@124', '', '', '', '')
ON DUPLICATE KEY UPDATE pass=pass;

-- ---------- 2) EMPLOYEES (ID manual unique, har device pe same) ----------
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  pass VARCHAR(100) NOT NULL,
  desg VARCHAR(100) DEFAULT '',
  mob VARCHAR(15) DEFAULT '',
  photo LONGTEXT,
  store VARCHAR(150) DEFAULT '',
  storeArea VARCHAR(150) DEFAULT '',
  storeLat DOUBLE NULL,
  storeLon DOUBLE NULL,
  storeLink TEXT,
  created DATE NULL,
  mustChangePass TINYINT(1) DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_emp_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 3) ATTENDANCE RECORDS (empId+date unique) ----------
CREATE TABLE IF NOT EXISTS records (
  empId VARCHAR(50) NOT NULL,
  `date` DATE NOT NULL,
  name VARCHAR(100) DEFAULT '',
  store VARCHAR(150) DEFAULT '',
  storeArea VARCHAR(150) DEFAULT '',
  storeLink TEXT,
  type VARCHAR(20) DEFAULT 'Duty',
  inTime VARCHAR(30) DEFAULT '',
  inPhoto LONGTEXT,
  inLat VARCHAR(30) DEFAULT '',
  inLon VARCHAR(30) DEFAULT '',
  inLocLink TEXT,
  inDistM INT NULL,
  outTime VARCHAR(30) DEFAULT '',
  outPhoto LONGTEXT,
  outLat VARCHAR(30) DEFAULT '',
  outLon VARCHAR(30) DEFAULT '',
  outLocLink TEXT,
  outDistM INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (empId, `date`),
  INDEX idx_rec_date (`date`),
  INDEX idx_rec_emp (empId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
