-- =========================================================
-- Airbnb Prototype – MySQL Schema
-- =========================================================
-- Tables:
--   users, properties, property_photos, bookings, favorites
-- Key ideas:
--   - role on users: TRAVELER | OWNER
--   - bookings have states: PENDING | ACCEPTED | CANCELLED
--   - availability check uses date-overlap logic at query time:
--       NOT (b.end_date < :start OR b.start_date > :end)
--   - helpful indexes for search and lookups
-- =========================================================

-- Use the target DB (created earlier)
USE airbnb_db;

-- -------------------------
-- USERS
-- -------------------------
CREATE TABLE IF NOT EXISTS users (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  role              ENUM('TRAVELER','OWNER') NOT NULL DEFAULT 'TRAVELER',
  name              VARCHAR(120) NOT NULL,
  email             VARCHAR(190) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  phone             VARCHAR(40),
  about             TEXT,
  city              VARCHAR(100),
  state             CHAR(2),
  country           VARCHAR(100),
  languages         VARCHAR(255),
  gender            ENUM('male','female','nonbinary','prefer_not_to_say') NULL,
  profile_photo_url VARCHAR(255),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_users_role        ON users(role);
CREATE INDEX idx_users_city_state  ON users(city, state);

-- -------------------------
-- PROPERTIES
-- -------------------------
CREATE TABLE IF NOT EXISTS properties (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  owner_id         INT NOT NULL,
  title            VARCHAR(200) NOT NULL,
  description      TEXT,
  type             ENUM('apartment','house','villa','studio','other') DEFAULT 'other',
  bedrooms         INT DEFAULT 1,
  bathrooms        DECIMAL(3,1) DEFAULT 1.0,
  amenities        JSON,
  price_per_night  DECIMAL(10,2) NOT NULL,
  city             VARCHAR(100) NOT NULL,
  state            CHAR(2),
  country          VARCHAR(100) NOT NULL,
  guests_max       INT NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_properties_owner FOREIGN KEY (owner_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_properties_city               ON properties(city);
CREATE INDEX idx_properties_city_country       ON properties(city, country);
CREATE INDEX idx_properties_city_state_country ON properties(city, state, country);
CREATE INDEX idx_properties_price              ON properties(price_per_night);
CREATE INDEX idx_properties_created            ON properties(created_at);

-- -------------------------
-- PROPERTY PHOTOS
-- -------------------------
CREATE TABLE IF NOT EXISTS property_photos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  property_id  INT NOT NULL,
  url          VARCHAR(255) NOT NULL,
  CONSTRAINT fk_photos_property FOREIGN KEY (property_id)
    REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_property_photos_pid ON property_photos(property_id);

-- -------------------------
-- BOOKINGS
-- -------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  traveler_id  INT NOT NULL,
  property_id  INT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  guests       INT NOT NULL,
  status       ENUM('PENDING','ACCEPTED','CANCELLED') DEFAULT 'PENDING',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_traveler FOREIGN KEY (traveler_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_property FOREIGN KEY (property_id)
    REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT chk_booking_range CHECK (start_date <= end_date)
) ENGINE=InnoDB;

-- For availability queries and dashboards
CREATE INDEX idx_bookings_property_dates  ON bookings(property_id, start_date, end_date);
CREATE INDEX idx_bookings_traveler_status ON bookings(traveler_id, status);
CREATE INDEX idx_bookings_property_status ON bookings(property_id, status);

-- -------------------------
-- FAVORITES (junction table)
-- -------------------------
CREATE TABLE IF NOT EXISTS favorites (
  traveler_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (traveler_id, property_id),
  CONSTRAINT fk_favorites_traveler FOREIGN KEY (traveler_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_property FOREIGN KEY (property_id)
    REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_favorites_traveler ON favorites(traveler_id);
CREATE INDEX idx_favorites_property ON favorites(property_id);

-- =========================================================
-- OPTIONAL: seed a couple of demo rows (comment out if not needed)
-- =========================================================
-- INSERT INTO users (role, name, email, password_hash)
-- VALUES ('OWNER','Demo Owner','owner@example.com','$2a$12$abcdefghijklmnopqrstuv'); -- fake hash

-- INSERT INTO properties (owner_id,title,description,type,bedrooms,bathrooms,amenities,price_per_night,city,state,country,guests_max)
-- VALUES (LAST_INSERT_ID(),'Sunny Apt Downtown','Close to everything','apartment',1,1,JSON_ARRAY('wifi','ac'),129.00,'San Jose','CA','USA',2);

-- INSERT INTO users (role, name, email, password_hash)
-- VALUES ('TRAVELER','Demo Traveler','traveler@example.com','$2a$12$abcdefghijklmnopqrstuv'); -- fake hash
