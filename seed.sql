-- ============================================
-- LeoConnect Seed Data
-- Leo Multiple District 306 Sri Lanka & Maldives
-- Updated: December 2025
-- ============================================

-- DROP ALL TABLES FIRST (in correct order for foreign keys)
DROP TABLE IF EXISTS event_rsvps;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS comment_likes;
DROP TABLE IF EXISTS post_shares;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS post_images;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS fcm_tokens;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS user_follows;
DROP TABLE IF EXISTS user_following_clubs;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS districts;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS districts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  total_clubs INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 0
);


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
-- MD Executive Committee (all verified)
('user-md-president', 'rageesh@leomd306.org', 'Leo Lion Rageesh Yogeswaran', 'https://ui-avatars.com/api/?name=Rageesh+Yogeswaran&background=8C4E29&color=fff', '306-MD-00001', 'Multiple District President | MJF PMAF PFLM', 1, 1, 1),
('user-md-ipp', 'navod@leomd306.org', 'Leo Lion Navod Kiriwaththuduwa', 'https://ui-avatars.com/api/?name=Navod+Kiriwaththuduwa&background=8C4E29&color=fff', '306-MD-00002', 'Immediate Past President | MAF', 1, 1, 1),
('user-md-vp', 'rachika@leomd306.org', 'Leo Lion Rachika Sovis', 'https://ui-avatars.com/api/?name=Rachika+Sovis&background=8C4E29&color=fff', '306-MD-00003', 'Multiple District Vice President | FLM', 1, 1, 1),
('user-md-secretary', 'sajithraj@leomd306.org', 'Leo Lion Sajithraj Puganeskumar', 'https://ui-avatars.com/api/?name=Sajithraj+Puganeskumar&background=8C4E29&color=fff', '306-MD-00004', 'Multiple District Secretary | PFLM', 1, 1, 1),
('user-md-treasurer', 'sunera@leomd306.org', 'Leo Lion Sunera Naveed', 'https://ui-avatars.com/api/?name=Sunera+Naveed&background=8C4E29&color=fff', '306-MD-00005', 'Multiple District Treasurer | MAF FLM', 1, 1, 1),

-- District D1 Leadership (verified)
('user-d1-president', 'yashika@leod1.org', 'Leo Yashika Nethmini', 'https://ui-avatars.com/api/?name=Yashika+Nethmini&background=FFB68E&color=000', '306-D1-00001', 'District 306 D1 President', 1, 1, 1),
('user-d1-secretary', 'sanduni@leod1.org', 'Leo Sanduni Theekshana', 'https://ui-avatars.com/api/?name=Sanduni+Theekshana&background=FFB68E&color=000', '306-D1-00002', 'District 306 D1 Secretary', 1, 1, 1),

-- District D2 Leadership (verified)
('user-d2-president', 'thameera@leod2.org', 'Leo Thameera Dananjaya', 'https://ui-avatars.com/api/?name=Thameera+Dananjaya&background=FFB68E&color=000', '306-D2-00001', 'District 306 D2 President', 1, 1, 1),
('user-d2-secretary', 'devinda@leod2.org', 'Leo Devinda Perera', 'https://ui-avatars.com/api/?name=Devinda+Perera&background=FFB68E&color=000', '306-D2-00002', 'District 306 D2 Secretary', 1, 1, 1),

-- District D3 Leadership (verified)
('user-d3-president', 'lasikumar@leod3.org', 'Leo Lion Lasikumar Parameswaran', 'https://ui-avatars.com/api/?name=Lasikumar+Parameswaran&background=FFB68E&color=000', '306-D3-00001', 'District 306 D3 President', 1, 1, 1),
('user-d3-secretary', 'fathima@leod3.org', 'Leo Fathima Mishell', 'https://ui-avatars.com/api/?name=Fathima+Mishell&background=FFB68E&color=000', '306-D3-00002', 'District 306 D3 Secretary', 1, 1, 1),

-- District D4 Leadership (verified)
('user-d4-president', 'nimasha@leod4.org', 'Leo Nimasha Jayakody', 'https://ui-avatars.com/api/?name=Nimasha+Jayakody&background=FFB68E&color=000', '306-D4-00001', 'District 306 D4 President | FLM', 1, 1, 1),
('user-d4-secretary', 'asha@leod4.org', 'Leo Lion Asha Lakshani', 'https://ui-avatars.com/api/?name=Asha+Lakshani&background=FFB68E&color=000', '306-D4-00002', 'District 306 D4 Secretary', 1, 1, 1),

-- District D5 Leadership (verified)
('user-d5-president', 'senthooran@leod5.org', 'Leo Senthooran Vijayakumar', 'https://ui-avatars.com/api/?name=Senthooran+Vijayakumar&background=FFB68E&color=000', '306-D5-00001', 'District 306 D5 President', 1, 1, 1),
('user-d5-secretary', 'vilogini@leod5.org', 'Leo Lion Vilogini Vasanthan', 'https://ui-avatars.com/api/?name=Vilogini+Vasanthan&background=FFB68E&color=000', '306-D5-00002', 'District 306 D5 Secretary', 1, 1, 1),

-- District D6 Leadership (verified)
('user-d6-president', 'anjana@leod6.org', 'Leo Anjana Udesh', 'https://ui-avatars.com/api/?name=Anjana+Udesh&background=FFB68E&color=000', '306-D6-00001', 'District 306 D6 President | FLM', 1, 1, 1),
('user-d6-secretary', 'vinuri@leod6.org', 'Leo Lion Vinuri Nirodya', 'https://ui-avatars.com/api/?name=Vinuri+Nirodya&background=FFB68E&color=000', '306-D6-00002', 'District 306 D6 Secretary | PFLM', 1, 1, 1),

-- District D7 Leadership (verified)
('user-d7-president', 'hansathi@leod7.org', 'Leo Lion Hansathi Imethma Gallage', 'https://ui-avatars.com/api/?name=Hansathi+Gallage&background=FFB68E&color=000', '306-D7-00001', 'District 306 D7 President | FLM', 1, 1, 1),
('user-d7-secretary', 'vihara@leod7.org', 'Leo Vihara Jayaweera', 'https://ui-avatars.com/api/?name=Vihara+Jayaweera&background=FFB68E&color=000', '306-D7-00002', 'District 306 D7 Secretary', 1, 1, 1),

-- District D8 Leadership (verified)
('user-d8-president', 'anushka@leod8.org', 'Leo Anushka Shaminda', 'https://ui-avatars.com/api/?name=Anushka+Shaminda&background=FFB68E&color=000', '306-D8-00001', 'District 306 D8 President', 1, 1, 1),
('user-d8-secretary', 'peenaka@leod8.org', 'Leo Peenaka Wedamulla', 'https://ui-avatars.com/api/?name=Peenaka+Wedamulla&background=FFB68E&color=000', '306-D8-00002', 'District 306 D8 Secretary', 1, 1, 1),

-- District D9 Leadership (verified)
('user-d9-president', 'supasan@leod9.org', 'Leo Supasan Deemantha', 'https://ui-avatars.com/api/?name=Supasan+Deemantha&background=FFB68E&color=000', '306-D9-00001', 'District 306 D9 President', 1, 1, 1),
('user-d9-secretary', 'tharushi@leod9.org', 'Leo Tharushi Karunarathna', 'https://ui-avatars.com/api/?name=Tharushi+Karunarathna&background=FFB68E&color=000', '306-D9-00002', 'District 306 D9 Secretary', 1, 1, 1),

-- District D10 Leadership (verified)
('user-d10-president', 'harishanthan@leod10.org', 'Leo Harishanthan Sivakumaran', 'https://ui-avatars.com/api/?name=Harishanthan+Sivakumaran&background=FFB68E&color=000', '306-D10-00001', 'District 306 D10 President', 1, 1, 1),
('user-d10-secretary', 'methsith@leod10.org', 'Leo Methsith Chandrasena', 'https://ui-avatars.com/api/?name=Methsith+Chandrasena&background=FFB68E&color=000', '306-D10-00002', 'District 306 D10 Secretary', 1, 1, 1),

-- District D11 Leadership (verified)
('user-d11-president', 'pahan@leod11.org', 'Leo Lion Pahan Ruchiranga', 'https://ui-avatars.com/api/?name=Pahan+Ruchiranga&background=FFB68E&color=000', '306-D11-00001', 'District 306 D11 President', 1, 1, 1),

-- District D12 Leadership (verified)
('user-d12-president', 'kintas@leod12.org', 'Leo Lion Kintas Sebastian Yogarasa', 'https://ui-avatars.com/api/?name=Kintas+Yogarasa&background=FFB68E&color=000', '306-D12-00001', 'District 306 D12 President | PFLM', 1, 1, 1),
('user-d12-secretary', 'deepani@leod12.org', 'Leo Deepani Srikanthan', 'https://ui-avatars.com/api/?name=Deepani+Srikanthan&background=FFB68E&color=000', '306-D12-00002', 'District 306 D12 Secretary', 1, 1, 1),

-- Sample Members (not verified - regular users)
('user-member-1', 'kasun@uoc.lk', 'Kasun Perera', 'https://ui-avatars.com/api/?name=Kasun+Perera&background=random', '306-D1-10001', 'LeoConnect Developer', 0, 1, 0),
('user-member-2', 'tharushi@kdu.lk', 'Tharushi Fernando', 'https://ui-avatars.com/api/?name=Tharushi+Fernando&background=random', '306-D1-10002', 'Active Leo Member', 0, 1, 0);

-- ============================================
-- CLUBS - All 12 Districts (200+ Clubs)
-- ============================================

-- DISTRICT D1 CLUBS (21 clubs)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d1-colombo-host', 'Leo Club of Colombo (Host)', 'Leo District 306 D1', 'district-306-d1', 'The pioneering Leo Club of Colombo, serving the community since establishment.', 'Leo Yashika Nethmini', 'https://ui-avatars.com/api/?name=Colombo+Host&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800', 1, 'Colombo, Sri Lanka'),
('club-d1-colombo-millennium', 'Leo Club of Colombo Millennium II', 'Leo District 306 D1', 'district-306-d1', 'Building future leaders through community service.', 'Leo Vinuk Thismalpola', 'https://ui-avatars.com/api/?name=Millennium&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1, 'Colombo, Sri Lanka'),
('club-d1-colombo-six-stars', 'Leo Club of Colombo Six New Stars', 'Leo District 306 D1', 'district-306-d1', 'Six stars shining bright for community service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Six+Stars&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Colombo, Sri Lanka'),
('club-d1-uoc-science', 'Leo Club of Colombo University Faculty of Science', 'Leo District 306 D1', 'district-306-d1', 'Empowering science undergraduates through service.', 'Leo Member', 'https://ui-avatars.com/api/?name=UOC+Science&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'University of Colombo, Sri Lanka'),
('club-d1-cosmopolitan', 'Leo Club of Cosmopolitan Creators', 'Leo District 306 D1', 'district-306-d1', 'Creating positive change in our community.', 'Leo Member', 'https://ui-avatars.com/api/?name=Cosmopolitan&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800', 1, 'Colombo, Sri Lanka'),
('club-d1-dsc', 'Leo Club of Defence Services College', 'Leo District 306 D1', 'district-306-d1', 'Serving with discipline and dedication.', 'Leo Member', 'https://ui-avatars.com/api/?name=DSC&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800', 1, 'Colombo, Sri Lanka'),
('club-d1-iit', 'Leo Club of Informatic Institute of Technology', 'Leo District 306 D1', 'district-306-d1', 'Tech-savvy Leos serving through innovation.', 'Leo Member', 'https://ui-avatars.com/api/?name=IIT&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800', 1, 'Colombo 06, Sri Lanka'),
('club-d1-kalutara-bmv', 'Leo Club of Kalutara Balika Maha Vidyalaya', 'Leo District 306 D1', 'district-306-d1', 'Empowering young women through leadership.', 'Leo Member', 'https://ui-avatars.com/api/?name=Kalutara+BMV&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Kalutara, Sri Lanka'),
('club-d1-kalutara-vidyalaya', 'Leo Club of Kalutara Vidyalaya', 'Leo District 306 D1', 'district-306-d1', 'Youth leadership in Kalutara.', 'Leo Member', 'https://ui-avatars.com/api/?name=Kalutara+V&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Kalutara, Sri Lanka'),
('club-d1-kdu', 'Leo Club of Kothalawala Defense University', 'Leo District 306 D1', 'district-306-d1', 'Leadership through service at KDU.', 'Leo Member', 'https://ui-avatars.com/api/?name=KDU&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800', 1, 'Ratmalana, Sri Lanka'),
('club-d1-moratuwa', 'Leo Club of Moratuwa', 'Leo District 306 D1', 'district-306-d1', 'Serving Moratuwa community with pride.', 'Leo Methmal Wickramasinghe', 'https://ui-avatars.com/api/?name=Moratuwa&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Moratuwa, Sri Lanka'),
('club-d1-moratuwa-2020', 'Leo Club of Moratuwa 2020', 'Leo District 306 D1', 'district-306-d1', 'New generation of Moratuwa Leos.', 'Leo Member', 'https://ui-avatars.com/api/?name=Moratuwa+2020&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Moratuwa, Sri Lanka'),
('club-d1-moratuwa-ratmalana', 'Leo Club of Moratuwa Ratmalana', 'Leo District 306 D1', 'district-306-d1', 'Bridging Moratuwa and Ratmalana communities.', 'Leo Member', 'https://ui-avatars.com/api/?name=Ratmalana&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800', 1, 'Ratmalana, Sri Lanka'),
('club-d1-mt-lavinia', 'Leo Club of Mount Lavinia Orient Centennial', 'Leo District 306 D1', 'district-306-d1', 'Serving Mount Lavinia for 100 years.', 'Leo Lion Sajani Wijesuriya', 'https://ui-avatars.com/api/?name=Mt+Lavinia&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800', 1, 'Mount Lavinia, Sri Lanka'),
('club-d1-pow-ii', 'Leo Club of Prince of Wales College II', 'Leo District 306 D1', 'district-306-d1', 'Royal service to the community.', 'Leo Member', 'https://ui-avatars.com/api/?name=POW+II&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Moratuwa, Sri Lanka'),
('club-d1-royal-achievers', 'Leo Club of Royal Achievers', 'Leo District 306 D1', 'district-306-d1', 'Achieving excellence in service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Royal+Achievers&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800', 1, 'Colombo, Sri Lanka'),
('club-d1-uoc-arts', 'Leo Club of University of Colombo Faculty of Arts', 'Leo District 306 D1', 'district-306-d1', 'Arts faculty serving with creativity.', 'Leo Member', 'https://ui-avatars.com/api/?name=UOC+Arts&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', 1, 'University of Colombo, Sri Lanka'),
('club-d1-uoc-alumni', 'Leo Club of UOC Alumni', 'Leo District 306 D1', 'district-306-d1', 'UOC alumni continuing to serve.', 'Leo Member', 'https://ui-avatars.com/api/?name=UOC+Alumni&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', 1, 'Colombo, Sri Lanka'),
('club-d1-uoc-foa-alumni', 'Leo Club of UOC FOA Alumni', 'Leo District 306 D1', 'district-306-d1', 'Faculty of Arts alumni in service.', 'Leo Member', 'https://ui-avatars.com/api/?name=FOA+Alumni&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', 1, 'Colombo, Sri Lanka'),
('club-d1-princess-wales', 'Leo Club of Princess of Wales College', 'Leo District 306 D1', 'district-306-d1', 'Empowering young women leaders.', 'Leo Member', 'https://ui-avatars.com/api/?name=Princess+Wales&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Moratuwa, Sri Lanka'),
('club-d1-sri-sumangala', 'Leo Club of Sri Sumangala College', 'Leo District 306 D1', 'district-306-d1', 'Buddhist values in community service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Sri+Sumangala&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Panadura, Sri Lanka');

-- DISTRICT D2 CLUBS (18 clubs)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d2-arawwala', 'Leo Club of Arawwala', 'Leo District 306 D2', 'district-306-d2', 'Serving Arawwala community.', 'Leo Thameera Dananjaya', 'https://ui-avatars.com/api/?name=Arawwala&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Arawwala, Sri Lanka'),
('club-d2-colombo-monarch', 'Leo Club of Colombo Monarch', 'Leo District 306 D2', 'district-306-d2', 'Royal service in Colombo.', 'Leo Member', 'https://ui-avatars.com/api/?name=Monarch&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1, 'Colombo, Sri Lanka'),
('club-d2-dehiwala-east', 'Leo Club of Dehiwala East', 'Leo District 306 D2', 'district-306-d2', 'Eastern Dehiwala community service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Dehiwala+East&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800', 1, 'Dehiwala, Sri Lanka'),
('club-d2-ethos', 'Leo Club of Ethos International College Colombo VII', 'Leo District 306 D2', 'district-306-d2', 'International education meets service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Ethos&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Colombo 07, Sri Lanka'),
('club-d2-gwuim', 'Leo Club of Gampaha Wickramarachchi University of Indigenous Medicine FISSMS', 'Leo District 306 D2', 'district-306-d2', 'Traditional medicine students in service.', 'Leo Member', 'https://ui-avatars.com/api/?name=GWUIM&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', 1, 'Gampaha, Sri Lanka'),
('club-d2-godigamuwa', 'Leo Club of Godigamuwa', 'Leo District 306 D2', 'district-306-d2', 'Rural community development.', 'Leo Member', 'https://ui-avatars.com/api/?name=Godigamuwa&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Godigamuwa, Sri Lanka'),
('club-d2-kalubowila', 'Leo Club of Kalubowila', 'Leo District 306 D2', 'district-306-d2', 'Healthcare community service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Kalubowila&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', 1, 'Kalubowila, Sri Lanka'),
('club-d2-millaniya', 'Leo Club of Millaniya', 'Leo District 306 D2', 'district-306-d2', 'Millaniya youth leadership.', 'Leo Member', 'https://ui-avatars.com/api/?name=Millaniya&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Millaniya, Sri Lanka'),
('club-d2-pepiliyana', 'Leo Club of Pepiliyana Woodlands', 'Leo District 306 D2', 'district-306-d2', 'Green initiatives in Pepiliyana.', 'Leo Member', 'https://ui-avatars.com/api/?name=Pepiliyana&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Pepiliyana, Sri Lanka'),
('club-d2-piliyandala', 'Leo Club of Piliyandala', 'Leo District 306 D2', 'district-306-d2', 'Serving Piliyandala community.', 'Leo Eshan Kasturiarachchi', 'https://ui-avatars.com/api/?name=Piliyandala&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', 1, 'Piliyandala, Sri Lanka'),
('club-d2-piliyandala-cc', 'Leo Club of Piliyandala Central College', 'Leo District 306 D2', 'district-306-d2', 'School-based community service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Piliyandala+CC&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Piliyandala, Sri Lanka'),
('club-d2-polgasowita', 'Leo Club of Polgasowita', 'Leo District 306 D2', 'district-306-d2', 'Rural youth empowerment.', 'Leo Member', 'https://ui-avatars.com/api/?name=Polgasowita&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Polgasowita, Sri Lanka'),
('club-d2-raththanapitiya', 'Leo Club of Raththanapitiya', 'Leo District 306 D2', 'district-306-d2', 'Urban community development.', 'Leo Member', 'https://ui-avatars.com/api/?name=Raththanapitiya&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Boralesgamuwa, Sri Lanka'),
('club-d2-saegis', 'Leo Club of Saegis Campus', 'Leo District 306 D2', 'district-306-d2', 'Campus-based service initiatives.', 'Leo Member', 'https://ui-avatars.com/api/?name=Saegis&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Nugegoda, Sri Lanka'),
('club-d2-sltrc', 'Leo Club of Sri Lanka Technological and Research Campus', 'Leo District 306 D2', 'district-306-d2', 'Tech innovation for community.', 'Leo Member', 'https://ui-avatars.com/api/?name=SLTRC&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800', 1, 'Sri Lanka'),
('club-d2-taxila', 'Leo Club of Taxila Central College II', 'Leo District 306 D2', 'district-306-d2', 'School service excellence.', 'Leo Member', 'https://ui-avatars.com/api/?name=Taxila&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Homagama, Sri Lanka'),
('club-d2-uom', 'Leo Club of University of Moratuwa', 'Leo District 306 D2', 'district-306-d2', 'Engineering excellence in service.', 'Leo Member', 'https://ui-avatars.com/api/?name=UOM&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Moratuwa, Sri Lanka'),
('club-d2-usjp', 'Leo Club of University of Sri Jayewardenepura', 'Leo District 306 D2', 'district-306-d2', 'Leading university in service.', 'Leo Member', 'https://ui-avatars.com/api/?name=USJP&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Nugegoda, Sri Lanka');

-- DISTRICT D3 CLUBS (13 clubs)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d3-bci-negombo', 'Leo Club of B C I Negombo', 'Leo District 306 D3', 'district-306-d3', 'BCI Negombo community service.', 'Leo Lion Lasikumar Parameswaran', 'https://ui-avatars.com/api/?name=BCI+Negombo&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Negombo, Sri Lanka'),
('club-d3-colombo-legends', 'Leo Club of Colombo Central Legends', 'Leo District 306 D3', 'district-306-d3', 'Legendary service in central Colombo.', 'Leo Member', 'https://ui-avatars.com/api/?name=Legends&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1, 'Colombo, Sri Lanka'),
('club-d3-waters-meet', 'Leo Club of Colombo Waters Meet', 'Leo District 306 D3', 'district-306-d3', 'Where service meets community.', 'Leo Member', 'https://ui-avatars.com/api/?name=Waters+Meet&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800', 1, 'Colombo, Sri Lanka'),
('club-d3-marawila-marians', 'Leo Club of Marawila Chilaw Marians', 'Leo District 306 D3', 'district-306-d3', 'Coastal community development.', 'Leo Member', 'https://ui-avatars.com/api/?name=Marians&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800', 1, 'Marawila, Sri Lanka'),
('club-d3-negombo-catamaran', 'Leo Club of Negombo Catamaran', 'Leo District 306 D3', 'district-306-d3', 'Sailing towards better communities.', 'Leo Member', 'https://ui-avatars.com/api/?name=Catamaran&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800', 1, 'Negombo, Sri Lanka'),
('club-d3-negombo-city', 'Leo Club of Negombo City', 'Leo District 306 D3', 'district-306-d3', 'City-wide community initiatives.', 'Leo Member', 'https://ui-avatars.com/api/?name=Negombo+City&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800', 1, 'Negombo, Sri Lanka'),
('club-d3-negombo-host', 'Leo Club of Negombo Host', 'Leo District 306 D3', 'district-306-d3', 'Hosting service in Negombo.', 'Leo Member', 'https://ui-avatars.com/api/?name=Negombo+Host&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800', 1, 'Negombo, Sri Lanka'),
('club-d3-negombo-orient', 'Leo Club of Negombo Orient', 'Leo District 306 D3', 'district-306-d3', 'Eastern Negombo service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Negombo+Orient&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800', 1, 'Negombo, Sri Lanka'),
('club-d3-pamunugama', 'Leo Club of Pamunugama Jaela', 'Leo District 306 D3', 'district-306-d3', 'Jaela community development.', 'Leo Member', 'https://ui-avatars.com/api/?name=Pamunugama&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800', 1, 'Ja-Ela, Sri Lanka'),
('club-d3-salapura', 'Leo Club of Salapura City', 'Leo District 306 D3', 'district-306-d3', 'Urban service initiatives.', 'Leo Member', 'https://ui-avatars.com/api/?name=Salapura&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Sri Lanka'),
('club-d3-wattala', 'Leo Club of Wattala', 'Leo District 306 D3', 'district-306-d3', 'First Leo Club in Sri Lanka.', 'Leo Lion Chanuka Wijeweera', 'https://ui-avatars.com/api/?name=Wattala&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1, 'Wattala, Sri Lanka'),
('club-d3-wattala-classic', 'Leo Club of Wattala Classic', 'Leo District 306 D3', 'district-306-d3', 'Classic service in Wattala.', 'Leo Member', 'https://ui-avatars.com/api/?name=Wattala+Classic&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1, 'Wattala, Sri Lanka'),
('club-d3-wayamba', 'Leo Club of Wayamba Golden Gateway', 'Leo District 306 D3', 'district-306-d3', 'Gateway to service in Wayamba.', 'Leo Member', 'https://ui-avatars.com/api/?name=Wayamba&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Wayamba, Sri Lanka');

-- DISTRICT D4 CLUBS (23 clubs)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d4-biyagama', 'Leo Club of Biyagama Alliance', 'Leo District 306 D4', 'district-306-d4', 'Alliance for Biyagama development.', 'Leo Nimasha Jayakody', 'https://ui-avatars.com/api/?name=Biyagama&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800', 1, 'Biyagama, Sri Lanka'),
('club-d4-colombo-centrum', 'Leo Club of Colombo Centrum', 'Leo District 306 D4', 'district-306-d4', 'Central Colombo youth leadership.', 'Leo Lion Dimithri Ranawake', 'https://ui-avatars.com/api/?name=Centrum&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800', 1, 'Colombo, Sri Lanka'),
('club-d4-colombo-circle', 'Leo Club of Colombo Circle', 'Leo District 306 D4', 'district-306-d4', 'Circle of service in Colombo.', 'Leo Member', 'https://ui-avatars.com/api/?name=Circle&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800', 1, 'Colombo, Sri Lanka'),
('club-d4-downtown', 'Leo Club of Colombo Downtown Alliance', 'Leo District 306 D4', 'district-306-d4', 'Downtown community service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Downtown&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800', 1, 'Colombo, Sri Lanka'),
('club-d4-eye-care', 'Leo Club of Colombo Eye Care', 'Leo District 306 D4', 'district-306-d4', 'Vision care for community.', 'Leo Member', 'https://ui-avatars.com/api/?name=Eye+Care&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', 1, 'Colombo, Sri Lanka'),
('club-d4-grand-city', 'Leo Club of Colombo Grand City', 'Leo District 306 D4', 'district-306-d4', 'Grand initiatives for the city.', 'Leo Member', 'https://ui-avatars.com/api/?name=Grand+City&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800', 1, 'Colombo, Sri Lanka'),
('club-d4-grand-town', 'Leo Club of Colombo Grand Town', 'Leo District 306 D4', 'district-306-d4', 'Town-wide service projects.', 'Leo Member', 'https://ui-avatars.com/api/?name=Grand+Town&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800', 1, 'Colombo, Sri Lanka'),
('club-d4-midtown-rhlc', 'Leo Club of Colombo Mid Town - Ramanathan Hindu Ladies College', 'Leo District 306 D4', 'district-306-d4', 'Empowering young women.', 'Leo Member', 'https://ui-avatars.com/api/?name=RHLC&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Colombo, Sri Lanka'),
('club-d4-somerset', 'Leo Club of Colombo Somerset', 'Leo District 306 D4', 'district-306-d4', 'Somerset community service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Somerset&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Colombo, Sri Lanka'),
('club-d4-gampaha-circle', 'Leo Club of Gampaha Circle', 'Leo District 306 D4', 'district-306-d4', 'Circle of service in Gampaha.', 'Leo Member', 'https://ui-avatars.com/api/?name=Gampaha+Circle&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800', 1, 'Gampaha, Sri Lanka'),
('club-d4-gampaha-metro', 'Leo Club of Gampaha Metro II', 'Leo District 306 D4', 'district-306-d4', 'Metro service in Gampaha.', 'Leo Tharindu Amarasinghe', 'https://ui-avatars.com/api/?name=Gampaha+Metro&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800', 1, 'Gampaha, Sri Lanka'),
('club-d4-gampaha-juniors', 'Leo Club of Gampaha Metro Juniors', 'Leo District 306 D4', 'district-306-d4', 'Junior Leos of Gampaha.', 'Leo Member', 'https://ui-avatars.com/api/?name=Metro+Juniors&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800', 1, 'Gampaha, Sri Lanka'),
('club-d4-holy-rosary', 'Leo Club of Holy Rosary Tamil Vidalayam', 'Leo District 306 D4', 'district-306-d4', 'Tamil school community service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Holy+Rosary&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Colombo, Sri Lanka'),
('club-d4-kelaniya-hwbmv', 'Leo Club of Kelaniya Helena Wijayawardana BMV', 'Leo District 306 D4', 'district-306-d4', 'Kelaniya school service.', 'Leo Member', 'https://ui-avatars.com/api/?name=HWBMV&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Kelaniya, Sri Lanka'),
('club-d4-kelaniya-ii', 'Leo Club of Kelaniya II', 'Leo District 306 D4', 'district-306-d4', 'Second Kelaniya Leo Club.', 'Leo Member', 'https://ui-avatars.com/api/?name=Kelaniya+II&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', 1, 'Kelaniya, Sri Lanka'),
('club-d4-kiribathgoda', 'Leo Club of Kiribathgoda Elpis', 'Leo District 306 D4', 'district-306-d4', 'Hope for Kiribathgoda.', 'Leo Member', 'https://ui-avatars.com/api/?name=Elpis&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Kiribathgoda, Sri Lanka'),
('club-d4-mahara', 'Leo Club of Mahara Youth', 'Leo District 306 D4', 'district-306-d4', 'Youth empowerment in Mahara.', 'Leo Member', 'https://ui-avatars.com/api/?name=Mahara&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Mahara, Sri Lanka'),
('club-d4-makola', 'Leo Club of Makola', 'Leo District 306 D4', 'district-306-d4', 'Makola community development.', 'Leo Member', 'https://ui-avatars.com/api/?name=Makola&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Makola, Sri Lanka'),
('club-d4-male', 'Leo Club of Male', 'Leo District 306 D4', 'district-306-d4', 'Representing Maldives in MD 306.', 'Leo Member', 'https://ui-avatars.com/api/?name=Male&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800', 1, 'Male, Maldives'),
('club-d4-uok', 'Leo Club of University of Kelaniya', 'Leo District 306 D4', 'district-306-d4', 'UoK students in service.', 'Leo Lion Asha Lakshani', 'https://ui-avatars.com/api/?name=UOK&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', 1, 'Kelaniya, Sri Lanka'),
('club-d4-uok-alumni', 'Leo Club of UOK Alumni', 'Leo District 306 D4', 'district-306-d4', 'UoK alumni continuing service.', 'Leo Member', 'https://ui-avatars.com/api/?name=UOK+Alumni&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', 1, 'Kelaniya, Sri Lanka'),
('club-d4-weliweriya', 'Leo Club of Weliweriya', 'Leo District 306 D4', 'district-306-d4', 'Weliweriya youth service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Weliweriya&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Weliweriya, Sri Lanka'),
('club-d4-yakkala', 'Leo Club of Yakkala City', 'Leo District 306 D4', 'district-306-d4', 'Yakkala city development.', 'Leo Member', 'https://ui-avatars.com/api/?name=Yakkala&background=8C4E29&color=fff', 'https://images.unsplash.com/api/?name=Yakkala&background=8C4E29&color=fff', 1, 'Yakkala, Sri Lanka');

-- DISTRICT D5 CLUBS (14 clubs)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d5-capital-city', 'Leo Club of Colombo Capital City', 'Leo District 306 D5', 'district-306-d5', 'Capital city community service.', 'Leo Senthooran Vijayakumar', 'https://ui-avatars.com/api/?name=Capital+City&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1, 'Colombo, Sri Lanka'),
('club-d5-colombo-city', 'Leo Club of Colombo City', 'Leo District 306 D5', 'district-306-d5', 'City-wide development.', 'Leo Member', 'https://ui-avatars.com/api/?name=Colombo+City&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1, 'Colombo, Sri Lanka'),
('club-d5-evergreen', 'Leo Club of Colombo Evergreen', 'Leo District 306 D5', 'district-306-d5', 'Forever green initiatives.', 'Leo Member', 'https://ui-avatars.com/api/?name=Evergreen&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Colombo, Sri Lanka'),
('club-d5-grand-circle', 'Leo Club of Colombo Grand Circle', 'Leo District 306 D5', 'district-306-d5', 'Grand circle of service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Grand+Circle&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Colombo, Sri Lanka'),
('club-d5-wesley', 'Leo Club of Wesley College Colombo', 'Leo District 306 D5', 'district-306-d5', 'Methodist values in service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Wesley&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Colombo, Sri Lanka'),
('club-d5-hindu-alumni', 'Leo Club of Hindu Alumni', 'Leo District 306 D5', 'district-306-d5', 'Hindu College alumni service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Hindu+Alumni&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', 1, 'Colombo, Sri Lanka'),
('club-d5-attanagalla', 'Leo Club of Attanagalla', 'Leo District 306 D5', 'district-306-d5', 'Rural community development.', 'Leo Member', 'https://ui-avatars.com/api/?name=Attanagalla&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Attanagalla, Sri Lanka');

-- DISTRICT D6 CLUBS (22 clubs - selecting key ones)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d6-avissawella', 'Leo Club of Avissawella', 'Leo District 306 D6', 'district-306-d6', 'Avissawella community service.', 'Leo Anjana Udesh', 'https://ui-avatars.com/api/?name=Avissawella&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Avissawella, Sri Lanka'),
('club-d6-battaramulla', 'Leo Club of Battaramulla Synergy', 'Leo District 306 D6', 'district-306-d6', 'Synergy for community.', 'Leo Member', 'https://ui-avatars.com/api/?name=Battaramulla&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 1, 'Battaramulla, Sri Lanka'),
('club-d6-cinec', 'Leo Club of Cinec Campus', 'Leo District 306 D6', 'district-306-d6', 'CINEC students in service.', 'Leo Member', 'https://ui-avatars.com/api/?name=CINEC&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Malabe, Sri Lanka'),
('club-d6-colombo-heroes', 'Leo Club of Colombo Heroes', 'Leo District 306 D6', 'district-306-d6', 'Heroes of community service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Heroes&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800', 1, 'Colombo, Sri Lanka'),
('club-d6-nalanda', 'Leo Club of Nalanda College', 'Leo District 306 D6', 'district-306-d6', 'Buddhist education in service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Nalanda&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Colombo, Sri Lanka'),
('club-d6-sliit', 'Leo Club of Sri Lanka Institute of Information Technology', 'Leo District 306 D6', 'district-306-d6', 'IT innovation for community.', 'Leo Member', 'https://ui-avatars.com/api/?name=SLIIT&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800', 1, 'Malabe, Sri Lanka'),
('club-d6-uoc', 'Leo Club of University of Colombo', 'Leo District 306 D6', 'district-306-d6', 'UoC main Leo club.', 'Leo Member', 'https://ui-avatars.com/api/?name=UOC&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Colombo, Sri Lanka');

-- DISTRICT D7 CLUBS (36 clubs - selecting key ones)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d7-ananda', 'Leo Club of Ananda College', 'Leo District 306 D7', 'district-306-d7', 'Ananda College Leos.', 'Leo Lion Hansathi Gallage', 'https://ui-avatars.com/api/?name=Ananda&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Colombo, Sri Lanka'),
('club-d7-royal', 'Leo Club of Royal College Colombo 07', 'Leo District 306 D7', 'district-306-d7', 'Royal College legacy.', 'Leo Member', 'https://ui-avatars.com/api/?name=Royal&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Colombo 07, Sri Lanka'),
('club-d7-isipathana', 'Leo Club of Isipathana College', 'Leo District 306 D7', 'district-306-d7', 'Isipathana in service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Isipathana&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Colombo, Sri Lanka'),
('club-d7-thurstan', 'Leo Club of Thurstan College', 'Leo District 306 D7', 'district-306-d7', 'Thurstan tradition of service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Thurstan&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Colombo, Sri Lanka'),
('club-d7-nsbm', 'Leo Club of NSBM', 'Leo District 306 D7', 'district-306-d7', 'NSBM Green University Leos.', 'Leo Member', 'https://ui-avatars.com/api/?name=NSBM&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Homagama, Sri Lanka'),
('club-d7-sabaragamuwa', 'Leo Club of Sabaragamuwa University of Sri Lanka', 'Leo District 306 D7', 'district-306-d7', 'SUSL Leos in service.', 'Leo Member', 'https://ui-avatars.com/api/?name=SUSL&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Belihuloya, Sri Lanka');

-- DISTRICT D8 CLUBS (16 clubs)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d8-galle', 'Leo Club of Galle', 'Leo District 306 D8', 'district-306-d8', 'Historic Galle city service.', 'Leo Anushka Shaminda', 'https://ui-avatars.com/api/?name=Galle&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?w=800', 1, 'Galle, Sri Lanka'),
('club-d8-richmond', 'Leo Club of Centennial Richmond College', 'Leo District 306 D8', 'district-306-d8', 'Richmond College legacy.', 'Leo Navindu Seran', 'https://ui-avatars.com/api/?name=Richmond&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Galle, Sri Lanka'),
('club-d8-matara', 'Leo Club of Matara Nilwala II', 'Leo District 306 D8', 'district-306-d8', 'Nilwala river community.', 'Leo Hansini Rathnayaka', 'https://ui-avatars.com/api/?name=Matara&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=800', 1, 'Matara, Sri Lanka'),
('club-d8-ruhuna', 'Leo Club of University of Ruhuna Millenium', 'Leo District 306 D8', 'district-306-d8', 'Ruhuna University service.', 'Leo Peenaka Wedamulla', 'https://ui-avatars.com/api/?name=Ruhuna&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Matara, Sri Lanka'),
('club-d8-galle-fort', 'Leo Club of Galle Fort', 'Leo District 306 D8', 'district-306-d8', 'Historic fort community.', 'Leo Member', 'https://ui-avatars.com/api/?name=Galle+Fort&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?w=800', 1, 'Galle Fort, Sri Lanka');

-- DISTRICT D9 CLUBS (9 clubs)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d9-kandy', 'Leo Club of Kandy', 'Leo District 306 D9', 'district-306-d9', 'Hill capital service.', 'Leo Supasan Deemantha', 'https://ui-avatars.com/api/?name=Kandy&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1546708770-599f24eea41b?w=800', 1, 'Kandy, Sri Lanka'),
('club-d9-peradeniya', 'Leo Club of University of Peradeniya', 'Leo District 306 D9', 'district-306-d9', 'UoP Leos in service.', 'Leo Tharushi Karunarathna', 'https://ui-avatars.com/api/?name=Peradeniya&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Peradeniya, Sri Lanka'),
('club-d9-trincomalee', 'Leo Club of Trincomalee Heros', 'Leo District 306 D9', 'district-306-d9', 'Eastern heroes of service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Trincomalee&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800', 1, 'Trincomalee, Sri Lanka');

-- DISTRICT D10 CLUBS (12 clubs)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d10-batticaloa', 'Leo Club of Batticaloa', 'Leo District 306 D10', 'district-306-d10', 'Eastern province service.', 'Leo Harishanthan Sivakumaran', 'https://ui-avatars.com/api/?name=Batticaloa&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800', 1, 'Batticaloa, Sri Lanka'),
('club-d10-uwu', 'Leo Club of Uva Wellassa University', 'Leo District 306 D10', 'district-306-d10', 'UWU innovation in service.', 'Leo Methsith Chandrasena', 'https://ui-avatars.com/api/?name=UWU&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Badulla, Sri Lanka'),
('club-d10-kalmunai', 'Leo Club of Kalmunai', 'Leo District 306 D10', 'district-306-d10', 'Kalmunai community.', 'Leo Member', 'https://ui-avatars.com/api/?name=Kalmunai&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800', 1, 'Kalmunai, Sri Lanka');

-- DISTRICT D11 CLUBS (11 clubs)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d11-kurunegala', 'Leo Club of Kurunegala City', 'Leo District 306 D11', 'district-306-d11', 'Kurunegala city service.', 'Leo Lion Pahan Ruchiranga', 'https://ui-avatars.com/api/?name=Kurunegala&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Kurunegala, Sri Lanka'),
('club-d11-anuradhapura', 'Leo Club of Anuradhapura Royals', 'Leo District 306 D11', 'district-306-d11', 'Ancient city royals.', 'Leo Member', 'https://ui-avatars.com/api/?name=Anuradhapura&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Anuradhapura, Sri Lanka'),
('club-d11-fssh-rusl', 'Leo Club of FSSH RUSL', 'Leo District 306 D11', 'district-306-d11', 'Rajarata University service.', 'Leo Member', 'https://ui-avatars.com/api/?name=RUSL&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Mihintale, Sri Lanka');

-- DISTRICT D12 CLUBS (18 clubs)
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, is_official, address) VALUES
('club-d12-jaffna', 'Leo Club of Jaffna City', 'Leo District 306 D12', 'district-306-d12', 'Jaffna city leadership.', 'Leo Lion Kintas Yogarasa', 'https://ui-avatars.com/api/?name=Jaffna&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Jaffna, Sri Lanka'),
('club-d12-jaffna-central', 'Leo Club of Jaffna Central College', 'Leo District 306 D12', 'district-306-d12', 'Central College service.', 'Leo Deepani Srikanthan', 'https://ui-avatars.com/api/?name=Jaffna+Central&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', 1, 'Jaffna, Sri Lanka'),
('club-d12-kilinochchi', 'Leo Club of Kilinochchi', 'Leo District 306 D12', 'district-306-d12', 'Post-war community rebuild.', 'Leo Member', 'https://ui-avatars.com/api/?name=Kilinochchi&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 1, 'Kilinochchi, Sri Lanka'),
('club-d12-mannar', 'Leo Club of Mannar', 'Leo District 306 D12', 'district-306-d12', 'Coastal community service.', 'Leo Karunya Karunakaran', 'https://ui-avatars.com/api/?name=Mannar&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800', 1, 'Mannar, Sri Lanka'),
('club-d12-vavuniya', 'Leo Club of University of Vavuniya', 'Leo District 306 D12', 'district-306-d12', 'Vavuniya University service.', 'Leo Member', 'https://ui-avatars.com/api/?name=Vavuniya&background=8C4E29&color=fff', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', 1, 'Vavuniya, Sri Lanka');

-- ============================================
-- USER FOLLOWING CLUBS
-- ============================================
INSERT INTO user_following_clubs (user_id, club_id) VALUES
('user-d1-president', 'club-d1-colombo-host'),
('user-d2-president', 'club-d2-piliyandala'),
('user-d3-president', 'club-d3-wattala'),
('user-d4-president', 'club-d4-biyagama'),
('user-d5-president', 'club-d5-capital-city'),
('user-d6-president', 'club-d6-avissawella'),
('user-d7-president', 'club-d7-ananda'),
('user-d8-president', 'club-d8-galle'),
('user-d9-president', 'club-d9-kandy'),
('user-d10-president', 'club-d10-batticaloa'),
('user-d11-president', 'club-d11-kurunegala'),
('user-d12-president', 'club-d12-jaffna'),
('user-member-1', 'club-d1-uoc-science'),
('user-member-2', 'club-d1-kdu');

-- ============================================
-- USER FOLLOWS
-- ============================================
INSERT INTO user_follows (follower_id, following_id) VALUES
('user-member-1', 'user-md-president'),
('user-member-2', 'user-d1-president'),
('user-d1-president', 'user-md-president'),
('user-d4-president', 'user-md-president'),
('user-d8-president', 'user-md-president');

-- ============================================
-- POSTS
-- ============================================
INSERT INTO posts (id, club_id, author_id, content, image_url, is_pinned) VALUES
('post-1', 'club-d1-colombo-host', 'user-md-president', '🦁 Greetings from MD President! As we embrace our theme "Strive to Thrive", I encourage all Leos to go beyond surviving - strive, struggle, and stand strong to truly thrive. Together, we will make MD 306 shine across Sri Lanka and Maldives! #StriveToThrive #LeoMD306', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 1),
('post-2', 'club-d1-colombo-host', 'user-d1-president', '🩸 Successful blood donation campaign! Over 150 donors participated in our annual drive at Leo Youth Center. Thank you to everyone who contributed to saving lives! #WeServe #LeoD1', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800', 0),
('post-3', 'club-d3-wattala', 'user-d3-president', '🎉 Did you know? Leo Club of Wattala is the FIRST Leo Club in Sri Lanka, and it is still active today! Proud to continue this legacy of service. #LeoHistory #WattalaLeo', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 1),
('post-4', 'club-d4-uok', 'user-d4-secretary', '📚 Book donation drive completed! We donated 300+ books to rural schools in Gampaha district. Education is the key to a brighter future! #LeoD4 #EducationForAll', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800', 0),
('post-5', 'club-d8-galle', 'user-d8-president', '🧠 Mental health awareness session for university students in the Southern Province. Breaking the stigma, one conversation at a time. Your mental health matters! #MentalHealthAwareness', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800', 0),
('post-6', 'club-d12-jaffna', 'user-d12-president', '🌳 Environmental project in Jaffna - 500 trees planted! Rebuilding our community and environment together. Northern Province Leos are rising! #GreenJaffna #LeoD12', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 0);

-- ============================================
-- COMMENTS
-- ============================================
INSERT INTO comments (id, post_id, user_id, content) VALUES
('comment-1', 'post-1', 'user-d1-president', 'Ready to Strive to Thrive! 💪'),
('comment-2', 'post-1', 'user-d4-president', 'Proud to serve under your leadership!'),
('comment-3', 'post-1', 'user-d8-president', 'D8 is ready for an amazing year! 🦁'),
('comment-4', 'post-2', 'user-member-1', 'Amazing initiative! Proud to be part of this 🙌'),
('comment-5', 'post-3', 'user-md-president', 'Thank you Wattala for starting this movement in Sri Lanka!'),
('comment-6', 'post-5', 'user-member-2', 'Mental health is so important. Thank you for this session!');

-- ============================================
-- POST LIKES
-- ============================================
INSERT INTO post_likes (post_id, user_id) VALUES
('post-1', 'user-d1-president'), ('post-1', 'user-d4-president'), ('post-1', 'user-d8-president'), ('post-1', 'user-member-1'),
('post-2', 'user-md-president'), ('post-2', 'user-member-1'),
('post-3', 'user-md-president'), ('post-3', 'user-d1-president'),
('post-4', 'user-d1-president'), ('post-4', 'user-member-2'),
('post-5', 'user-member-2'), ('post-5', 'user-d12-president'),
('post-6', 'user-md-president'), ('post-6', 'user-d8-president');

-- ============================================
-- EVENTS
-- ============================================
INSERT INTO events (id, club_id, author_id, name, description, event_date, image_url, rsvp_count) VALUES
('event-1', 'club-d1-colombo-host', 'user-d1-president', 'Annual Blood Donation Campaign 2025', 'Join us for our annual blood donation drive at Leo Youth Center, Colombo. Every drop counts! Register now to save lives.', '2025-01-15 09:00:00', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800', 85),
('event-2', 'club-d4-uok', 'user-d4-secretary', 'Leadership Workshop Series - UoK', 'A 3-day leadership development workshop featuring speakers from Lions International. Topics: public speaking, project management, community leadership.', '2025-01-20 14:00:00', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800', 65),
('event-3', 'club-d8-galle', 'user-d8-president', 'Southern Province Leo Rally 2025', 'Annual gathering of all Leo Clubs from the Southern Province. Networking, workshops, and awards ceremony at Galle Fort.', '2025-02-10 08:00:00', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', 200),
('event-4', 'club-d9-kandy', 'user-d9-president', 'Hill Country Service Project', 'Community service in the central highlands. Healthcare camp and educational supplies distribution.', '2025-01-25 07:00:00', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', 45),
('event-5', 'club-d12-jaffna', 'user-d12-president', 'Northern Province Youth Conference', 'Empowering youth in the North. Skills development, career guidance, and community service planning for 2025.', '2025-02-01 09:00:00', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 120);

-- ============================================
-- EVENT RSVPs
-- ============================================
INSERT INTO event_rsvps (event_id, user_id) VALUES
('event-1', 'user-member-1'), ('event-1', 'user-member-2'), ('event-1', 'user-d1-secretary'),
('event-2', 'user-d4-president'), ('event-2', 'user-member-1'),
('event-3', 'user-d8-president'), ('event-3', 'user-d8-secretary'),
('event-4', 'user-d9-president'), ('event-4', 'user-d9-secretary'),
('event-5', 'user-d12-president'), ('event-5', 'user-d12-secretary');

-- ============================================
-- SAMPLE MESSAGES
-- ============================================
INSERT INTO messages (id, sender_id, receiver_id, content, is_read) VALUES
('msg-1', 'user-member-1', 'user-d1-president', 'Hello President! How can I join the blood donation campaign?', 1),
('msg-2', 'user-d1-president', 'user-member-1', 'Hi! Great to hear from you. Register at Leo Youth Center on January 15th. See you there!', 1),
('msg-3', 'user-md-president', 'user-d8-president', 'Excellent work on the Southern Rally preparation. Keep up the great work!', 1),
('msg-4', 'user-d8-president', 'user-md-president', 'Thank you MD President! We are ready to make it the best rally yet. Strive to Thrive! 🦁', 0);

-- ============================================
-- NOTIFICATION PREFERENCES
-- ============================================
INSERT INTO notification_preferences (user_id, messages_enabled, follows_enabled, posts_enabled, likes_enabled, comments_enabled) VALUES
('user-md-president', 1, 1, 1, 1, 1),
('user-d1-president', 1, 1, 1, 1, 1),
('user-d4-president', 1, 1, 1, 1, 1),
('user-d8-president', 1, 1, 1, 1, 1),
('user-member-1', 1, 1, 1, 1, 1),
('user-member-2', 1, 1, 1, 1, 1);
