CREATE DATABASE  IF NOT EXISTS `c237_seasonalstitchdb` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `c237_seasonalstitchdb`;
-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: localhost    Database: c237_seasonalstitchdb
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hoodies`
--

DROP TABLE IF EXISTS `hoodies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hoodies` (
  `hoodie_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `stock` int DEFAULT '0',
  `season` enum('Spring/Summer','Fall/Winter','Limited') DEFAULT 'Limited',
  PRIMARY KEY (`hoodie_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hoodies`
--

LOCK TABLES `hoodies` WRITE;
/*!40000 ALTER TABLE `hoodies` DISABLE KEYS */;
INSERT INTO `hoodies` VALUES (1,'Cinza Branca','Step into cozy 2000s nostalgia with the Cinza Branca Hoodie — the perfect blend of chill vibes and retro street energy. Its soft, mid-weight fabric keeps you warm on breezy fall days, while the relaxed, slightly oversized fit gives that effortless “I just woke up cute” look. With clean lines and a subtle colorway, it pairs perfectly with low-rise jeans, cargos, or chunky sneakers. It’s basically the hoodie version of a throwback playlist',67.99,'nodaysoff.png',6,'Fall/Winter'),(3,'Okuteerana','Ease into fall with this cozy oversized hoodie designed for crisp mornings and laid-back days. Made in a rich forest green, it features a relaxed fit and soft fabric that keeps you warm without feeling heavy. The minimalist “Workation – Business & Coffee” graphic adds a subtle vintage touch, perfect for casual outings, café hopping, or staying in.\r\n\r\nWhether you’re layering it on a cool autumn evening or wearing it solo on a breezy afternoon, this hoodie blends comfort and style effortlessly — your go-to piece for the fall season.\r\n\r\nDetails:',50.00,'workastationoversizedhoodiegreen-1769409574077-66496126.png',9,'Fall/Winter');
/*!40000 ALTER TABLE `hoodies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `invoice_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`invoice_id`),
  UNIQUE KEY `order_id` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES (1,12,'INV-20260126-12',50.00,0.00,50.00,'2026-01-26 15:25:20'),(2,13,'INV-20260126-13',50.00,0.00,50.00,'2026-01-26 15:37:26'),(3,14,'INV-20260126-14',50.00,0.00,50.00,'2026-01-26 15:53:50'),(4,15,'INV-20260126-15',339.95,0.00,339.95,'2026-01-26 16:01:50'),(5,16,'INV-20260126-16',35.00,0.00,35.00,'2026-01-26 16:23:03'),(6,17,'INV-20260126-17',50.00,0.00,50.00,'2026-01-26 20:10:44'),(7,18,'INV-20260126-18',50.00,0.00,50.00,'2026-01-26 20:41:34'),(8,19,'INV-20260126-19',50.00,0.00,50.00,'2026-01-26 20:43:01'),(9,20,'INV-20260127-20',50.00,0.00,50.00,'2026-01-27 08:33:59'),(10,21,'INV-20260127-21',100.00,0.00,100.00,'2026-01-27 08:50:44'),(11,22,'INV-20260127-22',50.00,0.00,50.00,'2026-01-27 09:00:16');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `hoodie_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `hoodie_id` (`hoodie_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`hoodie_id`) REFERENCES `hoodies` (`hoodie_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,1,1,67.99),(2,2,1,1,67.99),(3,3,1,1,67.99),(4,4,1,1,67.99),(5,5,1,1,67.99),(6,6,1,2,67.99),(7,7,1,1,67.99),(8,8,1,1,67.99),(9,9,1,1,67.99),(10,10,1,1,67.99),(11,11,1,1,67.99),(12,12,3,1,50.00),(13,13,3,1,50.00),(14,14,3,1,50.00),(15,15,1,5,67.99),(16,16,3,1,50.00),(17,17,3,1,50.00),(18,18,3,1,50.00),(19,19,3,1,50.00),(20,20,3,1,50.00),(21,21,3,2,50.00),(22,22,3,1,50.00);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping_name` varchar(100) DEFAULT NULL,
  `shipping_address` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'on_hold',
  `tracking_number` varchar(100) DEFAULT NULL,
  `tracking_provider` varchar(100) DEFAULT NULL,
  `tracking_url` varchar(255) DEFAULT NULL,
  `refund_status` varchar(20) DEFAULT NULL,
  `refund_reason` text,
  `refund_note` text,
  `refund_requested_at` datetime DEFAULT NULL,
  `refund_resolved_at` datetime DEFAULT NULL,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `points_redeemed` int NOT NULL DEFAULT '0',
  `points_earned` int NOT NULL DEFAULT '0',
  `payment_status` varchar(20) NOT NULL DEFAULT 'unpaid',
  `payment_provider` varchar(20) DEFAULT NULL,
  `payment_ref` varchar(100) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,8,67.99,'Peter','67 Hougang Drive 97','2025-12-02 17:46:34','on_hold',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2025-12-03 01:46:34'),(2,8,67.99,'Peter','Hougang Drive 67','2025-12-02 17:48:46','on_hold',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2025-12-03 01:48:46'),(3,8,67.99,'Peter','hougang drive thingy ','2025-12-02 17:51:25','on_hold',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2025-12-03 01:51:25'),(4,8,67.99,'Peter','67 Hougang Drive 67','2025-12-03 02:37:43','on_hold',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2025-12-03 10:37:43'),(5,8,67.99,'Peter','67 Hougang Drive 67','2025-12-03 03:06:00','on_hold',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2025-12-03 11:06:00'),(6,8,135.98,'ajdh','jksbda','2026-01-19 02:29:35','on_hold',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2026-01-19 10:29:35'),(7,8,67.99,'Peter','1123 sex street','2026-01-26 02:58:05','on_hold',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2026-01-26 10:58:05'),(8,8,67.99,'Peter','1234','2026-01-26 03:07:37','delivering',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2026-01-26 11:07:37'),(9,8,67.99,'Peter','asdfghj','2026-01-26 05:59:09','delivered',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2026-01-26 13:59:09'),(10,8,67.99,'Peter','ofknnf2ein','2026-01-26 06:04:34','pending',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2026-01-26 14:04:34'),(11,8,67.99,'Peter','ehwowi','2026-01-26 06:34:04','pending',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2026-01-26 14:34:04'),(12,8,50.00,'w32','e123e','2026-01-26 07:25:20','delivered',NULL,NULL,NULL,'approved','not up to size',NULL,'2026-01-26 15:39:55','2026-01-26 15:40:23',0.00,0,0,'paid',NULL,NULL,'2026-01-26 15:25:20'),(13,8,50.00,'Petr Lim','h8jsbdbs','2026-01-26 07:37:26','delivered',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,0,'paid',NULL,NULL,'2026-01-26 15:37:26'),(14,8,50.00,'Peter','mwmoirne','2026-01-26 07:53:50','delivered',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,50,'paid',NULL,NULL,'2026-01-26 15:53:50'),(15,8,339.95,'Peter','ewerdfgfcx','2026-01-26 08:01:50','delivering',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,339,'paid',NULL,NULL,'2026-01-26 16:01:50'),(16,8,35.00,'Peter','wsdfreawszx','2026-01-26 08:23:03','delivering',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,15.00,300,35,'paid',NULL,NULL,'2026-01-26 16:23:03'),(17,8,50.00,'oekfnowenf','weofneofnef','2026-01-26 12:10:44','pending',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,50,'paid',NULL,NULL,'2026-01-26 20:10:44'),(18,8,50.00,'Brauuu','n2ef2nf3','2026-01-26 12:41:34','pending',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,50,'paid','stripe','pi_3Stp6cAVKsdRhyku2JPGBFmo','2026-01-26 20:41:35'),(19,8,50.00,'iuiu','jbb','2026-01-26 12:43:01','pending',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,50,'paid','stripe','pi_3Stp85AVKsdRhyku0Ey1Hrw8','2026-01-26 20:43:02'),(20,8,50.00,'fji','fdwq','2026-01-27 00:33:59','delivered',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,50,'paid','stripe','pi_3Su0E4AVKsdRhyku1ZVcaObU','2026-01-27 08:33:59'),(21,8,100.00,'dd','dd','2026-01-27 00:50:44','delivered',NULL,NULL,NULL,'requested','not nice',NULL,'2026-01-27 08:56:50',NULL,0.00,0,100,'paid','stripe','pi_3Su0UFAVKsdRhyku1GOLkkyF','2026-01-27 08:50:44'),(22,8,50.00,'qq','qq','2026-01-27 01:00:16','pending',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,0,50,'paid','paypal',NULL,'2026-01-27 09:00:17');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promo_codes`
--

DROP TABLE IF EXISTS `promo_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promo_codes` (
  `code` varchar(50) NOT NULL,
  `discount_percent` decimal(5,2) NOT NULL,
  `expiry` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promo_codes`
--

LOCK TABLES `promo_codes` WRITE;
/*!40000 ALTER TABLE `promo_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `promo_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `order_id` int NOT NULL,
  `hoodie_id` int NOT NULL,
  `rating` tinyint NOT NULL,
  `review_text` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `unique_review` (`user_id`,`order_id`,`hoodie_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `points` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin User','admin@stitch.com','123456','admin',0),(3,'SexyAdmin','admin@stitch1.com','123456','admin',0),(4,'Admin Sha','admin@stitch2.com','123456','admin',0),(5,'Admin Kim','admin@stitch3.com','123456','admin',6),(6,'Admin Bray','admin@stitch4.com','123456','admin',0),(7,'Admin Ben','admin@stitch5.com','123456','admin',0),(8,'Peter','peter@peter.com','123456','user',1350);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-27  9:32:52
