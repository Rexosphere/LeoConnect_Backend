-- Seed Data

-- Users
INSERT INTO users (uid, email, display_name, photo_url, leo_id, is_webmaster, assigned_club_id, posts_count, followers_count, following_count) VALUES
('user-1', 'john.doe@example.com', 'John Doe', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', '306-A1-12345', 1, 'club-1', 5, 120, 50),
('user-2', 'sarah@example.com', 'Sarah Wilson', 'https://ui-avatars.com/api/?name=Sarah+Wilson&background=random', '306-A1-67890', 0, 'club-1', 3, 80, 40),
('user-3', 'mike@example.com', 'Mike Chen', 'https://ui-avatars.com/api/?name=Mike+Chen&background=random', '306-A2-11223', 0, 'club-2', 8, 150, 60),
('user-4', 'emma@example.com', 'Emma Davis', 'https://ui-avatars.com/api/?name=Emma+Davis&background=random', '306-B1-44556', 0, 'club-3', 2, 45, 20);

-- User Following Clubs
INSERT INTO user_following_clubs (user_id, club_id) VALUES
('user-1', 'club-1'),
('user-1', 'club-2'),
('user-2', 'club-1'),
('user-3', 'club-2'),
('user-3', 'club-3'),
('user-4', 'club-3');

-- Districts
INSERT INTO districts (name, total_clubs, total_members) VALUES
('District 306 A1', 25, 500),
('District 306 A2', 20, 400),
('District 306 B1', 18, 350),
('District 306 B2', 15, 300),
('District 306 C1', 22, 450),
('District 306 C2', 10, 200);

-- Clubs
INSERT INTO clubs (id, name, district, district_id, description, president, logo_url, cover_image_url, address, members_count, followers_count, posts_count, is_official, facebook_url, instagram_url) VALUES
('club-1', 'Leo Club of University of Sri Jayewardenepura', 'District 306 A1', 'district-306-a1', 'Empowering youth through service and leadership development.', 'Leo John Doe', 'https://ui-avatars.com/api/?name=USJ+Leo&background=random', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800', 'Gangodawila, Nugegoda, Sri Lanka', 50, 200, 10, 1, 'https://facebook.com/club-1', 'https://instagram.com/club-1'),
('club-2', 'Leo Club of Colombo Central', 'District 306 A1', 'district-306-a1', 'Building tomorrow''s leaders through community service.', 'Leo Mike Chen', 'https://ui-avatars.com/api/?name=Colombo+Central&background=random', 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800', 'Colombo 07, Sri Lanka', 40, 150, 8, 0, 'https://facebook.com/club-2', 'https://instagram.com/club-2'),
('club-colombo-city', 'Leo Club of Colombo City', 'District 306 A1', 'district-306-a1', 'We serve the community with pride.', 'Leo Alice Brown', 'https://ui-avatars.com/api/?name=Colombo+City&background=random', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', 'Colombo 03, Sri Lanka', 30, 100, 5, 1, 'https://facebook.com/club-colombo-city', 'https://instagram.com/club-colombo-city'),
('club-3', 'Leo Club of Kandy', 'District 306 A2', 'district-306-a2', 'Serving the community with passion and dedication.', 'Leo Emma Davis', 'https://ui-avatars.com/api/?name=Kandy+Leo&background=random', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', 'Kandy, Sri Lanka', 60, 250, 12, 1, 'https://facebook.com/club-3', 'https://instagram.com/club-3'),
('club-piliyandala', 'Leo Club of Piliyandala', 'District 306 A2', 'district-306-a2', 'Unity and service for a better future.', 'Leo Kasun Perera', 'https://ui-avatars.com/api/?name=Piliyandala+Leo&background=random', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', 'Piliyandala, Sri Lanka', 35, 120, 6, 0, 'https://facebook.com/club-piliyandala', 'https://instagram.com/club-piliyandala'),
('club-dehiwala', 'Leo Club of Dehiwala East', 'District 306 A2', 'district-306-a2', 'Making a difference in our community.', 'Leo Nimali Silva', 'https://ui-avatars.com/api/?name=Dehiwala+Leo&background=random', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800', 'Dehiwala, Sri Lanka', 25, 90, 4, 1, 'https://facebook.com/club-dehiwala', 'https://instagram.com/club-dehiwala'),
('club-4', 'Leo Club of Galle', 'District 306 B1', 'district-306-b1', 'Youth leadership and community development.', 'Leo Sarah Wilson', 'https://ui-avatars.com/api/?name=Galle+Leo&background=random', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', 'Galle, Sri Lanka', 45, 180, 9, 1, 'https://facebook.com/club-4', 'https://instagram.com/club-4'),
('club-wattala', 'Leo Club of Wattala', 'District 306 B1', 'district-306-b1', 'Service above self.', 'Leo Dinesh Kumar', 'https://ui-avatars.com/api/?name=Wattala+Leo&background=random', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800', 'Wattala, Sri Lanka', 30, 110, 5, 0, 'https://facebook.com/club-wattala', 'https://instagram.com/club-wattala'),
('club-negombo', 'Leo Club of Negombo', 'District 306 B1', 'district-306-b1', 'Together we serve.', 'Leo Shehan Fernando', 'https://ui-avatars.com/api/?name=Negombo+Leo&background=random', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', 'Negombo, Sri Lanka', 40, 140, 7, 1, 'https://facebook.com/club-negombo', 'https://instagram.com/club-negombo'),
('club-anuradhapura', 'Leo Club of Anuradhapura', 'District 306 B2', 'district-306-b2', 'Serving the ancient city.', 'Leo Ruwan Jayasinghe', 'https://ui-avatars.com/api/?name=Anuradhapura+Leo&background=random', 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800', 'Anuradhapura, Sri Lanka', 20, 80, 3, 0, 'https://facebook.com/club-anuradhapura', 'https://instagram.com/club-anuradhapura'),
('club-kurunegala', 'Leo Club of Kurunegala', 'District 306 C1', 'district-306-c1', 'Leadership and service.', 'Leo Thilini Bandara', 'https://ui-avatars.com/api/?name=Kurunegala+Leo&background=random', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', 'Kurunegala, Sri Lanka', 55, 220, 11, 1, 'https://facebook.com/club-kurunegala', 'https://instagram.com/club-kurunegala'),
('club-batticaloa', 'Leo Club of Batticaloa', 'District 306 C2', 'district-306-c2', 'Rising together.', 'Leo Pradeep Kumar', 'https://ui-avatars.com/api/?name=Batticaloa+Leo&background=random', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800', 'Batticaloa, Sri Lanka', 25, 95, 4, 0, 'https://facebook.com/club-batticaloa', 'https://instagram.com/club-batticaloa');

-- Posts
INSERT INTO posts (id, club_id, club_name, author_id, author_name, author_logo, content, image_url, likes_count, comments_count, shares_count) VALUES
('post-1', 'club-1', 'Leo Club of University of Sri Jayewardenepura', 'user-1', 'John Doe', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'Proud to announce our successful blood donation campaign! Over 150 donors participated. Thank you to everyone who contributed to saving lives! 🩸', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800', 245, 0, 10),
('post-2', 'club-2', 'Leo Club of Colombo Central', 'user-3', 'Mike Chen', 'https://ui-avatars.com/api/?name=Mike+Chen&background=random', 'Beach cleanup drive this Sunday! Join us in making our beaches cleaner and greener. Together we can make a difference! 🌊♻️', 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800', 189, 0, 5),
('post-3', 'club-1', 'Leo Club of University of Sri Jayewardenepura', 'user-1', 'John Doe', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'Leadership workshop with international speakers was a huge success! Thank you to all participants for making it memorable. 💪', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800', 312, 3, 15),
('post-4', 'club-3', 'Leo Club of Kandy', 'user-4', 'Emma Davis', 'https://ui-avatars.com/api/?name=Emma+Davis&background=random', 'Book donation drive for rural schools. Education is the key to a brighter future! 📚✨', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800', 167, 3, 8),
('post-5', 'club-4', 'Leo Club of Galle', 'user-2', 'Sarah Wilson', 'https://ui-avatars.com/api/?name=Sarah+Wilson&background=random', 'Mental health awareness session conducted for university students. Breaking the stigma, one conversation at a time. 🧠💚', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800', 234, 3, 12);

-- Comments
INSERT INTO comments (id, post_id, user_id, author_name, author_photo_url, content, likes_count) VALUES
('comment-1', 'post-3', 'user-2', 'Sarah Wilson', 'https://ui-avatars.com/api/?name=Sarah+Wilson&background=random', 'Great initiative! 👏', 2),
('comment-2', 'post-3', 'user-3', 'Mike Chen', 'https://ui-avatars.com/api/?name=Mike+Chen&background=random', 'Count me in for the next one.', 1),
('comment-3', 'post-3', 'user-4', 'Emma Davis', 'https://ui-avatars.com/api/?name=Emma+Davis&background=random', 'So proud of our club! ❤️', 5),
('comment-4', 'post-4', 'user-1', 'John Doe', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'Amazing work everyone.', 3),
('comment-5', 'post-4', 'user-2', 'Sarah Wilson', 'https://ui-avatars.com/api/?name=Sarah+Wilson&background=random', 'This is what Leoism is all about.', 4),
('comment-6', 'post-4', 'user-3', 'Mike Chen', 'https://ui-avatars.com/api/?name=Mike+Chen&background=random', 'Can''t wait to see the photos!', 2),
('comment-7', 'post-5', 'user-1', 'John Doe', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'Well done team! 💪', 6),
('comment-8', 'post-5', 'user-3', 'Mike Chen', 'https://ui-avatars.com/api/?name=Mike+Chen&background=random', 'Keep up the good work.', 1),
('comment-9', 'post-5', 'user-4', 'Emma Davis', 'https://ui-avatars.com/api/?name=Emma+Davis&background=random', 'Inspiring!', 2);

-- Post Likes (Randomly assigning some likes)
INSERT INTO post_likes (post_id, user_id) VALUES
('post-1', 'user-2'), ('post-1', 'user-3'), ('post-1', 'user-4'),
('post-2', 'user-1'), ('post-2', 'user-4'),
('post-3', 'user-2'), ('post-3', 'user-3'), ('post-3', 'user-4'),
('post-4', 'user-1'), ('post-4', 'user-2'),
('post-5', 'user-1'), ('post-5', 'user-3'), ('post-5', 'user-4');
