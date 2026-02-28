-- Create Database
CREATE DATABASE IF NOT EXISTS smart_influencing;
USE smart_influencing;

-- Influencers Table
CREATE TABLE IF NOT EXISTS influencers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  about TEXT,
  experience TEXT,
  contact VARCHAR(20),
  photo_url LONGTEXT,
  instagram VARCHAR(255),
  snapchat VARCHAR(255),
  youtube VARCHAR(255),
  facebook VARCHAR(255),
  twitter VARCHAR(255),
  hourly_rate DECIMAL(10, 2),
  rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  brand_name VARCHAR(255),
  contact VARCHAR(20),
  logo_url LONGTEXT,
  instagram VARCHAR(255),
  facebook VARCHAR(255),
  twitter VARCHAR(255),
  about TEXT,
  owner_name VARCHAR(255),
  owner_linkedin VARCHAR(255),
  owner_instagram VARCHAR(255),
  owner_twitter VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  brand_id INT NOT NULL,
  field VARCHAR(255),
  duration VARCHAR(100),
  payout DECIMAL(10, 2),
  work_details TEXT,
  overview TEXT,
  status ENUM('active', 'closed', 'completed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- Campaign Applications Table
CREATE TABLE IF NOT EXISTS campaign_applications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NOT NULL,
  influencer_id INT NOT NULL,
  status ENUM('waiting', 'accepted', 'rejected') DEFAULT 'waiting',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
  UNIQUE KEY unique_application (campaign_id, influencer_id)
);

-- Influencer Wallets Table
CREATE TABLE IF NOT EXISTS influencer_wallets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  influencer_id INT NOT NULL UNIQUE,
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  account_number VARCHAR(50),
  ifsc_code VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE
);

-- Chats Table
CREATE TABLE IF NOT EXISTS chats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  influencer_id INT NOT NULL,
  brand_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  UNIQUE KEY unique_chat (influencer_id, brand_id)
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  chat_id INT NOT NULL,
  sender_id INT NOT NULL,
  sender_type ENUM('influencer', 'brand') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- Work Projects Table (tracks accepted campaigns as ongoing work)
CREATE TABLE IF NOT EXISTS work_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NOT NULL,
  application_id INT NOT NULL,
  brand_id INT NOT NULL,
  influencer_id INT NOT NULL,
  status ENUM('ongoing', 'completed', 'cancelled') DEFAULT 'ongoing',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES campaign_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
  UNIQUE KEY unique_work (application_id)
);

-- Work Updates Table (influencer updates on project progress)
CREATE TABLE IF NOT EXISTS work_updates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_project_id INT NOT NULL,
  influencer_id INT NOT NULL,
  update_description TEXT NOT NULL,
  progress_percentage INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (work_project_id) REFERENCES work_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE
);

-- Ratings & Reviews Table (brand rates influencer after work completion)
CREATE TABLE IF NOT EXISTS ratings_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_project_id INT NOT NULL,
  brand_id INT NOT NULL,
  influencer_id INT NOT NULL,
  rating DECIMAL(3, 2) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_project_id) REFERENCES work_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
  UNIQUE KEY unique_rating (work_project_id)
);

-- Payout Accounts Table (influencer bank details)
CREATE TABLE IF NOT EXISTS payout_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  influencer_id INT NOT NULL UNIQUE,
  account_holder_name VARCHAR(255),
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20),
  bank_name VARCHAR(255),
  account_type ENUM('savings', 'checking') DEFAULT 'savings',
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE
);

-- Payments Table (payment records for work projects)
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_project_id INT NOT NULL UNIQUE,
  brand_id INT NOT NULL,
  influencer_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(5) DEFAULT 'INR',
  status ENUM('pending', 'in_admin_wallet', 'disputed', 'refunded', 'credited') DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'website',
  paid_at TIMESTAMP NULL,
  credited_at TIMESTAMP NULL,
  refunded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (work_project_id) REFERENCES work_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE
);

-- Wallet Transactions Table (transaction history)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  influencer_id INT NOT NULL,
  payment_id INT,
  transaction_type ENUM('credit', 'debit', 'refund', 'pending') DEFAULT 'pending',
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(12, 2) DEFAULT 0,
  balance_after DECIMAL(12, 2) DEFAULT 0,
  description TEXT,
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  related_work_project_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
  FOREIGN KEY (related_work_project_id) REFERENCES work_projects(id) ON DELETE SET NULL
);

-- Work Disputes Table (for handling work completion disputes)
CREATE TABLE IF NOT EXISTS work_disputes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_project_id INT NOT NULL UNIQUE,
  brand_id INT NOT NULL,
  influencer_id INT NOT NULL,
  initiated_by ENUM('brand', 'influencer') DEFAULT 'brand',
  reason TEXT,
  brand_says_complete BOOLEAN DEFAULT TRUE,
  influencer_says_complete BOOLEAN DEFAULT TRUE,
  status ENUM('pending', 'resolved') DEFAULT 'pending',
  resolution ENUM('credited', 'refunded', 'none') DEFAULT 'none',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (work_project_id) REFERENCES work_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE
);

-- Create Indexes
CREATE INDEX idx_email ON influencers(email);
CREATE INDEX idx_brand_email ON brands(email);
CREATE INDEX idx_campaign_brand ON campaigns(brand_id);
CREATE INDEX idx_application_campaign ON campaign_applications(campaign_id);
CREATE INDEX idx_application_influencer ON campaign_applications(influencer_id);
CREATE INDEX idx_chat_messages ON chat_messages(chat_id);
CREATE INDEX idx_work_brand ON work_projects(brand_id);
CREATE INDEX idx_work_influencer ON work_projects(influencer_id);
CREATE INDEX idx_work_updates_project ON work_updates(work_project_id);
CREATE INDEX idx_work_updates_influencer ON work_updates(influencer_id);
CREATE INDEX idx_ratings_influencer ON ratings_reviews(influencer_id);
CREATE INDEX idx_ratings_brand ON ratings_reviews(brand_id);
CREATE INDEX idx_payments_brand ON payments(brand_id);
CREATE INDEX idx_payments_influencer ON payments(influencer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_transactions_influencer ON wallet_transactions(influencer_id);
CREATE INDEX idx_transactions_payment ON wallet_transactions(payment_id);
CREATE INDEX idx_disputes_work ON work_disputes(work_project_id);
CREATE INDEX idx_disputes_influencer ON work_disputes(influencer_id);
CREATE INDEX idx_payout_account ON payout_accounts(influencer_id);

-- ============================================
-- DUMMY DATA FOR TESTING & DEMONSTRATION
-- ============================================

-- Insert 5 Influencers (password: password123)
INSERT INTO influencers (email, password, name, about, experience, contact, photo_url, instagram, snapchat, youtube, facebook, twitter, hourly_rate, rating) VALUES
('influencer1@gmail.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvhKG6', 'Priya Singh', 'Fashion and lifestyle influencer with 150K followers', '3 years in fashion blogging', '+91-9876543210', 'https://via.placeholder.com/150?text=Priya', '@priyasingh_fashion', 'priyasnap', 'https://youtube.com/priya', 'https://facebook.com/priya', '@priya_fashion', 50.00, 4.5),
('influencer2@gmail.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvhKG6', 'Rahul Sharma', 'Tech and gadget reviewer', '4 years tech reviews', '+91-8765432109', 'https://via.placeholder.com/150?text=Rahul', '@rahul_tech_reviews', 'rahuljosh', 'https://youtube.com/rahul', 'https://facebook.com/rahul', '@rahul_tech', 60.00, 4.8),
('influencer3@gmail.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvhKG6', 'Ananya Gupta', 'Beauty and makeup expert', '2 years makeup content creator', '+91-7654321098', 'https://via.placeholder.com/150?text=Ananya', '@ananya_makeup_pro', 'ananyabeauty', 'https://youtube.com/ananya', 'https://facebook.com/ananya', '@ananya_makeup', 45.00, 4.7),
('influencer4@gmail.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvhKG6', 'Vikram Patel', 'Fitness and wellness coach', '5 years fitness coaching', '+91-6543210987', 'https://via.placeholder.com/150?text=Vikram', '@vikram_fitness_pro', 'vikramfitness', 'https://youtube.com/vikram', 'https://facebook.com/vikram', '@vikram_fit', 55.00, 4.9),
('influencer5@gmail.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvhKG6', 'Neha Kapoor', 'Food blogger and chef', '3 years food content', '+91-5432109876', 'https://via.placeholder.com/150?text=Neha', '@neha_foodies', 'neha_cooks', 'https://youtube.com/neha', 'https://facebook.com/neha', '@neha_food', 40.00, 4.6);

-- Insert 3 Brands (password: password123)
INSERT INTO brands (email, password, brand_name, contact, logo_url, instagram, facebook, twitter, about, owner_name, owner_linkedin, owner_instagram, owner_twitter) VALUES
('brand1@company.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvhKG6', 'TechGear Pro', '+91-9999988888', 'https://via.placeholder.com/150?text=TechGear', '@techgear_pro', 'https://facebook.com/techgearpro', '@techgear_pro', 'Leading tech accessories brand', 'Amit Kumar', 'https://linkedin.com/in/amit', '@amit_techgear', '@amit_tech'),
('brand2@company.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvhKG6', 'GlamBeauty Co', '+91-8888877777', 'https://via.placeholder.com/150?text=GlamBeauty', '@glambeauty_official', 'https://facebook.com/glambeauty', '@glambeauty_co', 'Premium beauty and cosmetics brand', 'Shreya Sharma', 'https://linkedin.com/in/shreya', '@shreya_beauty', '@shreya_glam'),
('brand3@company.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvhKG6', 'FitLife Nutrition', '+91-7777766666', 'https://via.placeholder.com/150?text=FitLife', '@fitlife_nutrition', 'https://facebook.com/fitlife', '@fitlife_fit', 'Sports nutrition and wellness products', 'Rohan Verma', 'https://linkedin.com/in/rohan', '@rohan_fitlife', '@rohan_nutrition');

-- Insert 2 Campaigns
INSERT INTO campaigns (brand_id, field, duration, payout, work_details, overview, status) VALUES
(1, 'Technology', '2 weeks', 15000.00, 'Create 5 Instagram posts and 2 Reels showcasing our new smartphone case. Content should highlight durability and design. Include product photos and lifestyle shots.', 'Promote our premium smartphone case collection to tech enthusiasts and early adopters', 'active'),
(2, 'Beauty', '3 weeks', 20000.00, 'Create makeup tutorials using our new lipstick collection. Produce 4 TikTok videos and 1 YouTube video. Show application techniques and various color combinations.', 'Launch our new lipstick collection with video tutorials from beauty influencers', 'active');

-- Insert Campaign Applications
INSERT INTO campaign_applications (campaign_id, influencer_id, status) VALUES
(1, 1, 'waiting'),
(1, 2, 'accepted'),
(2, 3, 'accepted'),
(2, 1, 'rejected');

-- Insert Influencer Wallets
INSERT INTO influencer_wallets (influencer_id, total_earnings, account_number, ifsc_code) VALUES
(1, 45000.00, '1234567890123456', 'SBIN0012345'),
(2, 85000.00, '2345678901234567', 'HDFC0098765'),
(3, 60000.00, '3456789012345678', 'AXIS0054321'),
(4, 120000.00, '4567890123456789', 'ICIC0087654'),
(5, 35000.00, '5678901234567890', 'SBIN0056789');

-- Insert Payout Accounts
INSERT INTO payout_accounts (influencer_id, account_holder_name, account_number, ifsc_code, bank_name, account_type, is_verified, verified_at) VALUES
(2, 'Rahul Sharma', '2345678901234567', 'HDFC0098765', 'HDFC Bank', 'savings', TRUE, NOW()),
(3, 'Ananya Gupta', '3456789012345678', 'AXIS0054321', 'Axis Bank', 'savings', TRUE, NOW()),
(4, 'Vikram Patel', '4567890123456789', 'ICIC0087654', 'ICICI Bank', 'savings', TRUE, NOW());

-- Insert Chat between Influencer 2 and Brand 1
INSERT INTO chats (influencer_id, brand_id) VALUES
(2, 1);

-- Insert Chat Messages
INSERT INTO chat_messages (chat_id, sender_id, sender_type, message) VALUES
(1, 2, 'influencer', 'Hi! I am very interested in promoting your smartphone case. I have a great audience that would love this product.'),
(1, 1, 'brand', 'Thank you for your interest! We would love to work with you. Can we discuss the campaign details?'),
(1, 2, 'influencer', 'Absolutely! When can we start? I am available from next week.');

-- Insert Work Projects (accepted applications)
INSERT INTO work_projects (campaign_id, application_id, brand_id, influencer_id, status, started_at) VALUES
(1, 2, 1, 2, 'ongoing', NOW()),
(2, 3, 2, 3, 'completed', DATE_SUB(NOW(), INTERVAL 10 DAY));

-- Insert Work Updates
INSERT INTO work_updates (work_project_id, influencer_id, update_description, progress_percentage) VALUES
(1, 2, 'Created 3 Instagram posts featuring the smartphone case. Photos are pending approval', 60),
(2, 3, 'Completed all 4 TikTok videos and 1 YouTube video. All content has been published', 100);

-- Insert Ratings & Reviews
INSERT INTO ratings_reviews (work_project_id, brand_id, influencer_id, rating, review_text) VALUES
(2, 2, 3, 5.0, 'Excellent work! Ananya created amazing makeup tutorials that really showcased our products. Great engagement from her audience!');

-- Insert Payments
INSERT INTO payments (work_project_id, brand_id, influencer_id, amount, currency, status, payment_method, paid_at) VALUES
(2, 2, 3, 20000.00, 'INR', 'credited', 'website', NOW());

-- Insert Wallet Transactions
INSERT INTO wallet_transactions (influencer_id, payment_id, transaction_type, amount, balance_before, balance_after, description, status, related_work_project_id) VALUES
(3, 1, 'credit', 20000.00, 60000.00, 80000.00, 'Payment for completed campaign project', 'completed', 2);
