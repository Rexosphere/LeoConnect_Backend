-- ============================================
-- LeoConnect Remote-Safe Seed Data
-- Leo Multiple District 306 Sri Lanka & Maldives
-- Updated: December 2025
-- NOTE: This seed does NOT drop tables - safe for remote DB
-- ============================================

-- Clear existing data (in correct order for foreign keys)
DELETE FROM event_rsvps;
DELETE FROM events;
DELETE FROM comment_likes;
DELETE FROM post_shares;
DELETE FROM post_likes;
DELETE FROM post_images;
DELETE FROM comments;
DELETE FROM posts;
DELETE FROM notifications;
DELETE FROM notification_preferences;
DELETE FROM fcm_tokens;
DELETE FROM messages;
DELETE FROM user_follows;
DELETE FROM user_following_clubs;
DELETE FROM clubs;
DELETE FROM districts;
DELETE FROM users;

-- ============================================
-- DISTRICTS (12 Districts - 2025 Structure)
-- ============================================
INSERT INTO districts (name, total_clubs, total_members) VALUES
('Leo District 306 D1', 21, 420),
('Leo District 306 D2', 18, 360),
('Leo District 306 D3', 13, 260),
('Leo District 306 D4', 23, 460),
('Leo District 306 D5', 14, 280),
('Leo District 306 D6', 22, 440),
('Leo District 306 D7', 36, 720),
('Leo District 306 D8', 16, 320),
('Leo District 306 D9', 9, 180),
('Leo District 306 D10', 12, 240),
('Leo District 306 D11', 11, 220),
('Leo District 306 D12', 18, 360);

-- ============================================
-- USERS - MD Exco + District Presidents
-- ============================================
INSERT INTO users (uid, email, display_name, photo_url, leo_id, bio, is_webmaster, onboarding_completed, is_verified) VALUES
('user-md-president', 'rageesh@leomd306.org', 'Leo Lion Rageesh Yogeswaran', 'https://ui-avatars.com/api/?name=Rageesh+Yogeswaran&background=8C4E29&color=fff', '306-MD-00001', 'Multiple District President | MJF PMAF PFLM', 1, 1, 1),
('user-md-ipp', 'navod@leomd306.org', 'Leo Lion Navod Kiriwaththuduwa', 'https://ui-avatars.com/api/?name=Navod+Kiriwaththuduwa&background=8C4E29&color=fff', '306-MD-00002', 'Immediate Past President | MAF', 1, 1, 1),
('user-md-vp', 'rachika@leomd306.org', 'Leo Lion Rachika Sovis', 'https://ui-avatars.com/api/?name=Rachika+Sovis&background=8C4E29&color=fff', '306-MD-00003', 'Multiple District Vice President | FLM', 1, 1, 1),
('user-md-secretary', 'sajithraj@leomd306.org', 'Leo Lion Sajithraj Puganeskumar', 'https://ui-avatars.com/api/?name=Sajithraj+Puganeskumar&background=8C4E29&color=fff', '306-MD-00004', 'Multiple District Secretary | PFLM', 1, 1, 1),
('user-md-treasurer', 'sunera@leomd306.org', 'Leo Lion Sunera Naveed', 'https://ui-avatars.com/api/?name=Sunera+Naveed&background=8C4E29&color=fff', '306-MD-00005', 'Multiple District Treasurer | MAF FLM', 1, 1, 1),
('user-d1-president', 'yashika@leod1.org', 'Leo Yashika Nethmini', 'https://ui-avatars.com/api/?name=Yashika+Nethmini&background=FFB68E&color=000', '306-D1-00001', 'District 306 D1 President', 1, 1, 1),
('user-d1-secretary', 'sanduni@leod1.org', 'Leo Sanduni Theekshana', 'https://ui-avatars.com/api/?name=Sanduni+Theekshana&background=FFB68E&color=000', '306-D1-00002', 'District 306 D1 Secretary', 1, 1, 1),
('user-d2-president', 'thameera@leod2.org', 'Leo Thameera Dananjaya', 'https://ui-avatars.com/api/?name=Thameera+Dananjaya&background=FFB68E&color=000', '306-D2-00001', 'District 306 D2 President', 1, 1, 1),
('user-d2-secretary', 'devinda@leod2.org', 'Leo Devinda Perera', 'https://ui-avatars.com/api/?name=Devinda+Perera&background=FFB68E&color=000', '306-D2-00002', 'District 306 D2 Secretary', 1, 1, 1),
('user-d3-president', 'lasikumar@leod3.org', 'Leo Lion Lasikumar Parameswaran', 'https://ui-avatars.com/api/?name=Lasikumar+Parameswaran&background=FFB68E&color=000', '306-D3-00001', 'District 306 D3 President', 1, 1, 1),
('user-d3-secretary', 'fathima@leod3.org', 'Leo Fathima Mishell', 'https://ui-avatars.com/api/?name=Fathima+Mishell&background=FFB68E&color=000', '306-D3-00002', 'District 306 D3 Secretary', 1, 1, 1),
('user-d4-president', 'nimasha@leod4.org', 'Leo Nimasha Jayakody', 'https://ui-avatars.com/api/?name=Nimasha+Jayakody&background=FFB68E&color=000', '306-D4-00001', 'District 306 D4 President | FLM', 1, 1, 1),
('user-d4-secretary', 'asha@leod4.org', 'Leo Lion Asha Lakshani', 'https://ui-avatars.com/api/?name=Asha+Lakshani&background=FFB68E&color=000', '306-D4-00002', 'District 306 D4 Secretary', 1, 1, 1),
('user-d5-president', 'senthooran@leod5.org', 'Leo Senthooran Vijayakumar', 'https://ui-avatars.com/api/?name=Senthooran+Vijayakumar&background=FFB68E&color=000', '306-D5-00001', 'District 306 D5 President', 1, 1, 1),
('user-d5-secretary', 'vilogini@leod5.org', 'Leo Lion Vilogini Vasanthan', 'https://ui-avatars.com/api/?name=Vilogini+Vasanthan&background=FFB68E&color=000', '306-D5-00002', 'District 306 D5 Secretary', 1, 1, 1),
('user-d6-president', 'anjana@leod6.org', 'Leo Anjana Udesh', 'https://ui-avatars.com/api/?name=Anjana+Udesh&background=FFB68E&color=000', '306-D6-00001', 'District 306 D6 President | FLM', 1, 1, 1),
('user-d6-secretary', 'vinuri@leod6.org', 'Leo Lion Vinuri Nirodya', 'https://ui-avatars.com/api/?name=Vinuri+Nirodya&background=FFB68E&color=000', '306-D6-00002', 'District 306 D6 Secretary | PFLM', 1, 1, 1),
('user-d7-president', 'hansathi@leod7.org', 'Leo Lion Hansathi Imethma Gallage', 'https://ui-avatars.com/api/?name=Hansathi+Gallage&background=FFB68E&color=000', '306-D7-00001', 'District 306 D7 President | FLM', 1, 1, 1),
('user-d7-secretary', 'vihara@leod7.org', 'Leo Vihara Jayaweera', 'https://ui-avatars.com/api/?name=Vihara+Jayaweera&background=FFB68E&color=000', '306-D7-00002', 'District 306 D7 Secretary', 1, 1, 1),
('user-d8-president', 'anushka@leod8.org', 'Leo Anushka Shaminda', 'https://ui-avatars.com/api/?name=Anushka+Shaminda&background=FFB68E&color=000', '306-D8-00001', 'District 306 D8 President', 1, 1, 1),
('user-d8-secretary', 'peenaka@leod8.org', 'Leo Peenaka Wedamulla', 'https://ui-avatars.com/api/?name=Peenaka+Wedamulla&background=FFB68E&color=000', '306-D8-00002', 'District 306 D8 Secretary', 1, 1, 1),
('user-d9-president', 'supasan@leod9.org', 'Leo Supasan Deemantha', 'https://ui-avatars.com/api/?name=Supasan+Deemantha&background=FFB68E&color=000', '306-D9-00001', 'District 306 D9 President', 1, 1, 1),
('user-d9-secretary', 'tharushi@leod9.org', 'Leo Tharushi Karunarathna', 'https://ui-avatars.com/api/?name=Tharushi+Karunarathna&background=FFB68E&color=000', '306-D9-00002', 'District 306 D9 Secretary', 1, 1, 1),
('user-d10-president', 'harishanthan@leod10.org', 'Leo Harishanthan Sivakumaran', 'https://ui-avatars.com/api/?name=Harishanthan+Sivakumaran&background=FFB68E&color=000', '306-D10-00001', 'District 306 D10 President', 1, 1, 1),
('user-d10-secretary', 'methsith@leod10.org', 'Leo Methsith Chandrasena', 'https://ui-avatars.com/api/?name=Methsith+Chandrasena&background=FFB68E&color=000', '306-D10-00002', 'District 306 D10 Secretary', 1, 1, 1),
('user-d11-president', 'pahan@leod11.org', 'Leo Lion Pahan Ruchiranga', 'https://ui-avatars.com/api/?name=Pahan+Ruchiranga&background=FFB68E&color=000', '306-D11-00001', 'District 306 D11 President', 1, 1, 1),
('user-d12-president', 'kintas@leod12.org', 'Leo Lion Kintas Sebastian Yogarasa', 'https://ui-avatars.com/api/?name=Kintas+Yogarasa&background=FFB68E&color=000', '306-D12-00001', 'District 306 D12 President | PFLM', 1, 1, 1),
('user-d12-secretary', 'deepani@leod12.org', 'Leo Deepani Srikanthan', 'https://ui-avatars.com/api/?name=Deepani+Srikanthan&background=FFB68E&color=000', '306-D12-00002', 'District 306 D12 Secretary', 1, 1, 1),
('user-member-1', 'kasun@uoc.lk', 'Kasun Perera', 'https://ui-avatars.com/api/?name=Kasun+Perera&background=random', '306-D1-10001', 'LeoConnect Developer', 0, 1, 0),
('user-member-2', 'tharushi@kdu.lk', 'Tharushi Fernando', 'https://ui-avatars.com/api/?name=Tharushi+Fernando&background=random', '306-D1-10002', 'Active Leo Member', 0, 1, 0);

-- ============================================
-- CLUBS (Sample from each district)
-- ============================================
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d1-colombo-host', 'Leo Club of Colombo (Host)', 'Leo District 306 D1', 'district-306-d1', 'The pioneering Leo Club of Colombo.', 'Leo Yashika Nethmini', 'https://ui-avatars.com/api/?name=Colombo+Host&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800', 1, 'Colombo, Sri Lanka'),
('club-d1-uoc-science', 'Leo Club of Colombo University Faculty of Science', 'Leo District 306 D1', 'district-306-d1', 'Empowering science undergraduates.', 'Leo Member', 'https://ui-avatars.com/api/?name=UOC+Science&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'University of Colombo'),
('club-d1-kdu', 'Leo Club of Kothalawala Defense University', 'Leo District 306 D1', 'district-306-d1', 'Leadership through service at KDU.', 'Leo Member', 'https://ui-avatars.com/api/?name=KDU&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800', 1, 'Ratmalana'),
('club-d2-piliyandala', 'Leo Club of Piliyandala', 'Leo District 306 D2', 'district-306-d2', 'Serving Piliyandala community.', 'Leo Eshan Kasturiarachchi', 'https://ui-avatars.com/api/?name=Piliyandala&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', 1, 'Piliyandala'),
('club-d3-wattala', 'Leo Club of Wattala', 'Leo District 306 D3', 'district-306-d3', 'First Leo Club in Sri Lanka.', 'Leo Lion Chanuka Wijeweera', 'https://ui-avatars.com/api/?name=Wattala&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1, 'Wattala'),
('club-d4-biyagama', 'Leo Club of Biyagama Alliance', 'Leo District 306 D4', 'district-306-d4', 'Alliance for Biyagama development.', 'Leo Nimasha Jayakody', 'https://ui-avatars.com/api/?name=Biyagama&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800', 1, 'Biyagama'),
('club-d4-uok', 'Leo Club of University of Kelaniya', 'Leo District 306 D4', 'district-306-d4', 'UoK students in service.', 'Leo Lion Asha Lakshani', 'https://ui-avatars.com/api/?name=UOK&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', 1, 'Kelaniya'),
('club-d5-capital-city', 'Leo Club of Colombo Capital City', 'Leo District 306 D5', 'district-306-d5', 'Capital city community service.', 'Leo Senthooran Vijayakumar', 'https://ui-avatars.com/api/?name=Capital+City&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1, 'Colombo'),
('club-d6-avissawella', 'Leo Club of Avissawella', 'Leo District 306 D6', 'district-306-d6', 'Avissawella community service.', 'Leo Anjana Udesh', 'https://ui-avatars.com/api/?name=Avissawella&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Avissawella'),
('club-d7-ananda', 'Leo Club of Ananda College', 'Leo District 306 D7', 'district-306-d7', 'Ananda College Leos.', 'Leo Lion Hansathi Gallage', 'https://ui-avatars.com/api/?name=Ananda&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Colombo'),
('club-d8-galle', 'Leo Club of Galle', 'Leo District 306 D8', 'district-306-d8', 'Historic Galle city service.', 'Leo Anushka Shaminda', 'https://ui-avatars.com/api/?name=Galle&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?w=800', 1, 'Galle'),
('club-d9-kandy', 'Leo Club of Kandy', 'Leo District 306 D9', 'district-306-d9', 'Hill capital service.', 'Leo Supasan Deemantha', 'https://ui-avatars.com/api/?name=Kandy&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1546708770-599f24eea41b?w=800', 1, 'Kandy'),
('club-d10-batticaloa', 'Leo Club of Batticaloa', 'Leo District 306 D10', 'district-306-d10', 'Eastern province service.', 'Leo Harishanthan Sivakumaran', 'https://ui-avatars.com/api/?name=Batticaloa&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800', 1, 'Batticaloa'),
('club-d11-kurunegala', 'Leo Club of Kurunegala City', 'Leo District 306 D11', 'district-306-d11', 'Kurunegala city service.', 'Leo Lion Pahan Ruchiranga', 'https://ui-avatars.com/api/?name=Kurunegala&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Kurunegala'),
('club-d12-jaffna', 'Leo Club of Jaffna City', 'Leo District 306 D12', 'district-306-d12', 'Jaffna city leadership.', 'Leo Lion Kintas Yogarasa', 'https://ui-avatars.com/api/?name=Jaffna&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Jaffna');

-- ============================================
-- USER FOLLOWING CLUBS
-- ============================================
INSERT INTO user_following_clubs (user_id, club_id) VALUES
('user-d1-president', 'club-d1-colombo-host'),
('user-d2-president', 'club-d2-piliyandala'),
('user-d3-president', 'club-d3-wattala'),
('user-d4-president', 'club-d4-biyagama'),
('user-member-1', 'club-d1-uoc-science'),
('user-member-2', 'club-d1-kdu');

-- ============================================
-- USER FOLLOWS
-- ============================================
INSERT INTO user_follows (follower_id, following_id) VALUES
('user-member-1', 'user-md-president'),
('user-member-2', 'user-d1-president'),
('user-d1-president', 'user-md-president');

-- ============================================
-- POSTS
-- ============================================
INSERT INTO posts (id, club_id, author_id, content, image_url, is_pinned) VALUES
('post-1', 'club-d1-colombo-host', 'user-md-president', '🦁 Greetings from MD President! Strive to Thrive! #LeoMD306', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 1),
('post-2', 'club-d1-colombo-host', 'user-d1-president', '🩸 Successful blood donation campaign! #WeServe', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800', 0),
('post-3', 'club-d3-wattala', 'user-d3-president', '🎉 Leo Club of Wattala - First Leo Club in Sri Lanka!', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1);

-- ============================================
-- COMMENTS
-- ============================================
INSERT INTO comments (id, post_id, user_id, content) VALUES
('comment-1', 'post-1', 'user-d1-president', 'Ready to Strive to Thrive! 💪'),
('comment-2', 'post-1', 'user-d4-president', 'Proud to serve under your leadership!');

-- ============================================
-- POST LIKES
-- ============================================
INSERT INTO post_likes (post_id, user_id) VALUES
('post-1', 'user-d1-president'),
('post-1', 'user-d4-president'),
('post-2', 'user-md-president'),
('post-3', 'user-md-president');

-- ============================================
-- EVENTS
-- ============================================
INSERT INTO events (id, club_id, author_id, name, description, event_date, image_url, rsvp_count) VALUES
('event-1', 'club-d1-colombo-host', 'user-d1-president', 'Annual Blood Donation 2025', 'Join our annual blood donation drive!', '2025-01-15 09:00:00', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800', 85);

-- ============================================
-- EVENT RSVPs
-- ============================================
INSERT INTO event_rsvps (event_id, user_id) VALUES
('event-1', 'user-member-1'),
('event-1', 'user-member-2');

-- ============================================
-- MESSAGES
-- ============================================
INSERT INTO messages (id, sender_id, receiver_id, content, is_read) VALUES
('msg-1', 'user-member-1', 'user-d1-president', 'Hello President! How can I join?', 1),
('msg-2', 'user-d1-president', 'user-member-1', 'Hi! Register at Leo Youth Center!', 1);
