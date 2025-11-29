-- Users: ID as VARCHAR(50) to match req.session.userId (Mongo-style string)
CREATE TABLE users (
  id            VARCHAR(50)              NOT NULL,
  role          ENUM('traveler','owner') NOT NULL DEFAULT 'traveler',
  name          VARCHAR(80)              NOT NULL,
  email         VARCHAR(190)             NOT NULL,
  password_hash VARCHAR(200)             NOT NULL,
  phone         VARCHAR(40),
  about         VARCHAR(500),
  city          VARCHAR(80),
  state         CHAR(2),
  country       VARCHAR(80),
  languages     JSON,
  gender        VARCHAR(30),
  avatar_url    VARCHAR(255),
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Properties: owner_id as VARCHAR(50) + photos JSON
CREATE TABLE properties (
  id          INT            NOT NULL AUTO_INCREMENT,
  owner_id    VARCHAR(50)    NOT NULL,
  title       VARCHAR(120)   NOT NULL,
  type        VARCHAR(60),
  description TEXT,
  amenities   JSON,
  price       DECIMAL(10,2)  NOT NULL,
  address     VARCHAR(255),
  city        VARCHAR(80),
  bedrooms    INT,
  bathrooms   INT,
  capacity    INT            NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  photos      JSON,
  PRIMARY KEY (id),
  KEY idx_properties_owner (owner_id),
  KEY idx_properties_city (city),
  CONSTRAINT properties_ibfk_1
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bookings: user_id as VARCHAR(50) + FK to users.id & properties.id
CREATE TABLE bookings (
  id          INT                                     NOT NULL AUTO_INCREMENT,
  user_id     VARCHAR(50)                             NOT NULL,
  property_id INT                                     NOT NULL,
  start_date  DATE                                    NOT NULL,
  end_date    DATE                                    NOT NULL,
  guests      INT                                     NOT NULL,
  status      ENUM('Pending','Accepted','Cancelled')  NOT NULL DEFAULT 'Pending',
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bookings_user (user_id),
  KEY idx_bookings_prop_dates (property_id, start_date, end_date),
  CONSTRAINT bookings_ibfk_1
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT bookings_ibfk_2
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Favorites: user_id as VARCHAR(50), property_id INT
CREATE TABLE favorites (
  id          INT          NOT NULL AUTO_INCREMENT,
  user_id     VARCHAR(50)  NOT NULL,
  property_id INT          NOT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_fav (user_id, property_id),
  KEY idx_favorites_user (user_id),
  KEY idx_favorites_property (property_id),
  CONSTRAINT favorites_ibfk_1
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT favorites_ibfk_2
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;