-- ====================================================================
-- Database: digital_document_db
-- Project: Veerendra – Digital Document Management System
-- Technology Stack: Node.js, Express.js, MySQL, HTML5, CSS3, JavaScript
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `digital_document_db`
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `digital_document_db`;

-- --------------------------------------------------------------------
-- Table 1: users
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- Table 2: categories
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- Table 3: documents
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `documents` (
  `document_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `category_id` INT NULL,
  `title` VARCHAR(150) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `upload_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
  CONSTRAINT `fk_documents_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_documents_category` FOREIGN KEY (`category_id`)
    REFERENCES `categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- Table 4: document_access
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `document_access` (
  `access_id` INT AUTO_INCREMENT PRIMARY KEY,
  `document_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `permission` VARCHAR(20) NOT NULL DEFAULT 'view',
  `granted_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_doc_user` (`document_id`, `user_id`),
  CONSTRAINT `fk_access_document` FOREIGN KEY (`document_id`)
    REFERENCES `documents` (`document_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_access_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------
-- Default Starter Categories
-- --------------------------------------------------------------------
INSERT INTO `categories` (`category_id`, `category_name`, `description`) VALUES
(1, 'Academic Records', 'Certificates, degrees, marksheets, and university transcripts'),
(2, 'Official Identity', 'Passports, National ID cards, driving licenses, and credentials'),
(3, 'Financial & Legal', 'Tax reports, invoices, salary slips, and legal contracts'),
(4, 'Technical & Code', 'Software architecture docs, project specifications, and manuals'),
(5, 'Medical & Health', 'Medical prescriptions, reports, insurance policies, and health records')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);
