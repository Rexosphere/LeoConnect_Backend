import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from datetime import datetime, timedelta
import random

# Initialize Firebase Admin
cred = credentials.Certificate("service-account.json")
try:
    firebase_admin.get_app()
except ValueError:
    firebase_admin.initialize_app(cred)

db = firestore.client()

def create_users():
    # Data from api.ts
    users_data = [
        {
            "uid": "user-1",
            "name": "John Doe",
            "email": "john.doe@example.com",
            "pic": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
            "leoId": "306-A1-12345",
            "isWebmaster": True,
            "assignedClubId": "club-1",
            "followingClubs": ["club-1", "club-2"]
        },
        {
            "uid": "user-2",
            "name": "Sarah Wilson",
            "email": "sarah@example.com",
            "pic": "https://ui-avatars.com/api/?name=Sarah+Wilson&background=random",
            "leoId": "306-A1-67890",
            "isWebmaster": False,
            "assignedClubId": "club-1",
            "followingClubs": ["club-1"]
        },
        {
            "uid": "user-3",
            "name": "Mike Chen",
            "email": "mike@example.com",
            "pic": "https://ui-avatars.com/api/?name=Mike+Chen&background=random",
            "leoId": "306-A2-11223",
            "isWebmaster": False,
            "assignedClubId": "club-2",
            "followingClubs": ["club-2", "club-3"]
        },
        {
            "uid": "user-4",
            "name": "Emma Davis",
            "email": "emma@example.com",
            "pic": "https://ui-avatars.com/api/?name=Emma+Davis&background=random",
            "leoId": "306-B1-44556",
            "isWebmaster": False,
            "assignedClubId": "club-3",
            "followingClubs": ["club-3"]
        }
    ]

    created_users = []
    for user in users_data:
        doc_ref = db.collection("users").document(user["uid"])
        doc_ref.set({
            "uid": user["uid"],
            "displayName": user["name"],
            "email": user["email"],
            "photoURL": user["pic"],
            "leoId": user["leoId"],
            "bio": "Passionate about community service and making a difference. 🦁",
            "isWebmaster": user["isWebmaster"],
            "assignedClubId": user["assignedClubId"],
            "followingClubs": user.get("followingClubs", []),
            "followersCount": random.randint(10, 500),
            "followingCount": random.randint(10, 500),
            "postsCount": random.randint(0, 50)
        })
        print(f"Created/Updated user: {user['name']}")
        created_users.append(user)
    
    return created_users

def create_clubs():
    # Data from api.ts + additional mock data
    clubs_data = [
        {
            "id": "club-1",
            "name": "Leo Club of University of Sri Jayewardenepura",
            "district": "District 306 A1",
            "districtId": "district-306-a1",
            "description": "Empowering youth through service and leadership development.",
            "president": "Leo John Doe",
            "logoUrl": "https://ui-avatars.com/api/?name=USJ+Leo&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800",
            "address": "Gangodawila, Nugegoda, Sri Lanka"
        },
        {
            "id": "club-2",
            "name": "Leo Club of Colombo Central",
            "district": "District 306 A1",
            "districtId": "district-306-a1",
            "description": "Building tomorrow's leaders through community service.",
            "president": "Leo Mike Chen",
            "logoUrl": "https://ui-avatars.com/api/?name=Colombo+Central&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800",
            "address": "Colombo 07, Sri Lanka"
        },
        {
            "id": "club-colombo-city",
            "name": "Leo Club of Colombo City",
            "district": "District 306 A1",
            "districtId": "district-306-a1",
            "description": "We serve the community with pride.",
            "president": "Leo Alice Brown",
            "logoUrl": "https://ui-avatars.com/api/?name=Colombo+City&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
            "address": "Colombo 03, Sri Lanka"
        },
        {
            "id": "club-3",
            "name": "Leo Club of Kandy",
            "district": "District 306 A2",
            "districtId": "district-306-a2",
            "description": "Serving the community with passion and dedication.",
            "president": "Leo Emma Davis",
            "logoUrl": "https://ui-avatars.com/api/?name=Kandy+Leo&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800",
            "address": "Kandy, Sri Lanka"
        },
        {
            "id": "club-piliyandala",
            "name": "Leo Club of Piliyandala",
            "district": "District 306 A2",
            "districtId": "district-306-a2",
            "description": "Unity and service for a better future.",
            "president": "Leo Kasun Perera",
            "logoUrl": "https://ui-avatars.com/api/?name=Piliyandala+Leo&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
            "address": "Piliyandala, Sri Lanka"
        },
        {
            "id": "club-dehiwala",
            "name": "Leo Club of Dehiwala East",
            "district": "District 306 A2",
            "districtId": "district-306-a2",
            "description": "Making a difference in our community.",
            "president": "Leo Nimali Silva",
            "logoUrl": "https://ui-avatars.com/api/?name=Dehiwala+Leo&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800",
            "address": "Dehiwala, Sri Lanka"
        },
        {
            "id": "club-4",
            "name": "Leo Club of Galle",
            "district": "District 306 B1",
            "districtId": "district-306-b1",
            "description": "Youth leadership and community development.",
            "president": "Leo Sarah Wilson",
            "logoUrl": "https://ui-avatars.com/api/?name=Galle+Leo&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800",
            "address": "Galle, Sri Lanka"
        },
        {
            "id": "club-wattala",
            "name": "Leo Club of Wattala",
            "district": "District 306 B1",
            "districtId": "district-306-b1",
            "description": "Service above self.",
            "president": "Leo Dinesh Kumar",
            "logoUrl": "https://ui-avatars.com/api/?name=Wattala+Leo&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800",
            "address": "Wattala, Sri Lanka"
        },
        {
            "id": "club-negombo",
            "name": "Leo Club of Negombo",
            "district": "District 306 B1",
            "districtId": "district-306-b1",
            "description": "Together we serve.",
            "president": "Leo Shehan Fernando",
            "logoUrl": "https://ui-avatars.com/api/?name=Negombo+Leo&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800",
            "address": "Negombo, Sri Lanka"
        },
        {
            "id": "club-anuradhapura",
            "name": "Leo Club of Anuradhapura",
            "district": "District 306 B2",
            "districtId": "district-306-b2",
            "description": "Serving the ancient city.",
            "president": "Leo Ruwan Jayasinghe",
            "logoUrl": "https://ui-avatars.com/api/?name=Anuradhapura+Leo&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800",
            "address": "Anuradhapura, Sri Lanka"
        },
        {
            "id": "club-kurunegala",
            "name": "Leo Club of Kurunegala",
            "district": "District 306 C1",
            "districtId": "district-306-c1",
            "description": "Leadership and service.",
            "president": "Leo Thilini Bandara",
            "logoUrl": "https://ui-avatars.com/api/?name=Kurunegala+Leo&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800",
            "address": "Kurunegala, Sri Lanka"
        },
        {
            "id": "club-batticaloa",
            "name": "Leo Club of Batticaloa",
            "district": "District 306 C2",
            "districtId": "district-306-c2",
            "description": "Rising together.",
            "president": "Leo Pradeep Kumar",
            "logoUrl": "https://ui-avatars.com/api/?name=Batticaloa+Leo&background=random",
            "coverImageUrl": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800",
            "address": "Batticaloa, Sri Lanka"
        }
    ]

    created_clubs = []
    for club in clubs_data:
        doc_ref = db.collection("clubs").document(club["id"])
        club_data = {
            "name": club["name"],
            "district": club["district"],
            "districtId": club["districtId"],
            "description": club["description"],
            "president": club["president"],
            "membersCount": random.randint(20, 100),
            "followersCount": random.randint(100, 1000),
            "postsCount": random.randint(0, 50),
            "email": f"contact@{club['id']}.leoclub.org",
            "phone": "+94 77 123 4567",
            "logoUrl": club.get("logoUrl"),
            "coverImageUrl": club.get("coverImageUrl"),
            "address": club.get("address"),
            "isOfficial": random.choice([True, False]),
            "socialLinks": {
                "facebook": f"https://facebook.com/{club['id']}",
                "instagram": f"https://instagram.com/{club['id']}",
                "twitter": f"https://twitter.com/{club['id']}"
            }
        }
        doc_ref.set(club_data)
        print(f"Created/Updated club: {club['name']}")
        created_clubs.append({"id": club["id"], **club_data})
            
    return created_clubs

def create_posts(users, clubs):
    # Data from api.ts
    posts_data = [
        {
            "postId": "post-1",
            "clubId": "club-1",
            "content": "Proud to announce our successful blood donation campaign! Over 150 donors participated. Thank you to everyone who contributed to saving lives! 🩸",
            "imageUrl": "https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800",
            "likesCount": 245,
            "authorId": "user-1" # Assumed
        },
        {
            "postId": "post-2",
            "clubId": "club-2",
            "content": "Beach cleanup drive this Sunday! Join us in making our beaches cleaner and greener. Together we can make a difference! 🌊♻️",
            "imageUrl": "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800",
            "likesCount": 189,
            "authorId": "user-3" # Assumed
        },
        {
            "postId": "post-3",
            "clubId": "club-1",
            "content": "Leadership workshop with international speakers was a huge success! Thank you to all participants for making it memorable. 💪",
            "imageUrl": "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800",
            "likesCount": 312,
            "authorId": "user-1" # Assumed
        },
        {
            "postId": "post-4",
            "clubId": "club-3",
            "content": "Book donation drive for rural schools. Education is the key to a brighter future! 📚✨",
            "imageUrl": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800",
            "likesCount": 167,
            "authorId": "user-4" # Assumed
        },
        {
            "postId": "post-5",
            "clubId": "club-4",
            "content": "Mental health awareness session conducted for university students. Breaking the stigma, one conversation at a time. 🧠💚",
            "imageUrl": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800",
            "likesCount": 234,
            "authorId": "user-2" # Assumed
        }
    ]

    print("Creating posts...")
    for post in posts_data:
        # Find author details
        author = next((u for u in users if u["uid"] == post["authorId"]), users[0])
        # Find club details
        club = next((c for c in clubs if c["id"] == post["clubId"]), None)
        club_name = club["name"] if club else "Unknown Club"
        
        post_doc = {
            "content": post["content"],
            "authorId": author["uid"],
            "authorName": author["name"],
            "authorLogo": author["pic"],
            "clubId": post["clubId"],
            "clubName": club_name,
            "imageUrl": post["imageUrl"],
            "images": [post["imageUrl"]] if post["imageUrl"] else [],
            "likesCount": post["likesCount"],
            "commentsCount": random.randint(0, 20),
            "sharesCount": random.randint(0, 10),
            "isPinned": False,
            "timestamp": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }

        db.collection("posts").document(post["postId"]).set(post_doc)
        print(f"Created/Updated post: {post['postId']}")
        
        # Create some likes in subcollection
        num_likes = random.randint(1, 5)
        for _ in range(num_likes):
            liker = random.choice(users)
            db.collection("posts").document(post["postId"]).collection("likes").document(liker["uid"]).set({
                "userId": liker["uid"],
                "timestamp": datetime.now().isoformat()
            })
    
    return posts_data

def create_districts():
    districts = [
        'District 306 A1', 
        'District 306 A2', 
        'District 306 B1', 
        'District 306 B2', 
        'District 306 C1', 
        'District 306 C2'
    ]
    
    print("Creating districts...")
    for district in districts:
        # Use district name as ID for simplicity, or auto-ID
        # Here we use name as ID to ensure uniqueness easily
        doc_ref = db.collection("districts").document(district)
        doc_ref.set({
            "name": district,
            "totalClubs": random.randint(10, 50),
            "totalMembers": random.randint(200, 1000)
        })
        print(f"Created/Updated district: {district}")

def create_comments(users, posts):
    print("Creating comments...")
    comments_data = [
        "Great initiative! 👏",
        "Count me in for the next one.",
        "So proud of our club! ❤️",
        "Amazing work everyone.",
        "This is what Leoism is all about.",
        "Can't wait to see the photos!",
        "Well done team! 💪",
        "Keep up the good work."
    ]

    for post in posts: # posts is a list of dicts from create_posts
        # Add 0-3 comments per post
        num_comments = random.randint(0, 3)
        for _ in range(num_comments):
            comment_id = f"comment-{random.randint(1000, 9999)}"
            user = random.choice(users)
            content = random.choice(comments_data)
            
            comment_doc = {
                "postId": post["postId"],
                "userId": user["uid"],
                "authorName": user["name"],
                "authorPhotoUrl": user["pic"],
                "content": content,
                "likesCount": random.randint(0, 10),
                "timestamp": datetime.now().isoformat()
            }
            
            db.collection("comments").document(comment_id).set(comment_doc)
            print(f"Created comment {comment_id} on post {post['postId']}")

def main():
    print("Populating database with data from React App...")
    try:
        users = create_users()
        create_districts()
        clubs = create_clubs()
        # create_posts now returns the list of created posts for reference
        posts = create_posts(users, clubs) 
        create_comments(users, posts)
        print("Database population complete!")
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure you have placed 'service-account.json' in this directory.")

if __name__ == "__main__":
    main()
