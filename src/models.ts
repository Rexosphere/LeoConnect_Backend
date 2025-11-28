export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  leoId: string | null;
  bio: string | null;
  isWebmaster: boolean;
  assignedClubId: string | null;
  followingClubs: string[];
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isMutualFollow?: boolean;
}

export interface Club {
  clubId: string;
  name: string;
  district: string;
  districtId: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  membersCount: number;
  followersCount: number;
  postsCount: number | null;
  isFollowing: boolean;
  isOfficial: boolean | null;
  isUserAdmin: boolean | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  socialLinks: SocialLinks | null;
}

export interface SocialLinks {
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
}

export interface Post {
  postId: string;
  clubId: string;
  clubName: string;
  authorId: string;
  authorName: string;
  authorLogo: string | null;
  content: string;
  imageUrl: string | null;
  images: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLikedByUser: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  commentId: string;
  postId: string;
  userId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  content: string;
  createdAt: string;
  likesCount: number;
  isLikedByUser: boolean;
}

export interface District {
  name: string;
  totalClubs: number;
  totalMembers: number;
}

// Mappers

export const mapToUserProfile = (data: any, uid: string): UserProfile => ({
  uid: data.uid || uid,
  email: data.email || '',
  displayName: data.displayName || '',
  photoURL: data.photoURL || null,
  leoId: data.leoId || null,
  bio: data.bio || null,
  isWebmaster: data.isWebmaster || false,
  assignedClubId: data.assignedClubId || null,
  followingClubs: data.followingClubs || [],
  postsCount: data.postsCount || 0,
  followersCount: data.followersCount || 0,
  followingCount: data.followingCount || 0,
  isFollowing: data.isFollowing, // Computed
  isMutualFollow: data.isMutualFollow // Computed
});

export const mapToClub = (data: any, id: string): Club => ({
  clubId: data.id || id,
  name: data.name || '',
  district: data.district || '',
  districtId: data.districtId || '',
  description: data.description || null,
  logoUrl: data.logoUrl || null,
  coverImageUrl: data.coverImageUrl || null,
  membersCount: data.membersCount || 0,
  followersCount: data.followersCount || 0,
  postsCount: data.postsCount || null,
  isFollowing: data.isFollowing || false, // Computed
  isOfficial: data.isOfficial || null,
  isUserAdmin: data.isUserAdmin || null, // Computed
  address: data.address || null,
  email: data.email || null,
  phone: data.phone || null,
  socialLinks: data.socialLinks ? {
    facebook: data.socialLinks.facebook || null,
    instagram: data.socialLinks.instagram || null,
    twitter: data.socialLinks.twitter || null
  } : null
});

export const mapToPost = (data: any, id: string): Post => ({
  postId: data.id || id,
  clubId: data.clubId || '',
  clubName: data.clubName || '',
  authorId: data.authorId || '',
  authorName: data.authorName || '',
  authorLogo: data.authorLogo || null,
  content: data.content || '',
  imageUrl: data.imageUrl || null,
  images: data.images || (data.imageUrl ? [data.imageUrl] : []),
  likesCount: data.likesCount || 0,
  commentsCount: data.commentsCount || 0,
  sharesCount: data.sharesCount || 0,
  isLikedByUser: data.isLikedByUser || false, // Computed
  isPinned: data.isPinned || false,
  createdAt: data.timestamp || new Date().toISOString(), // Map timestamp to createdAt
  updatedAt: data.updatedAt || data.timestamp || new Date().toISOString()
});

export const mapToComment = (data: any, id: string): Comment => ({
  commentId: data.id || id,
  postId: data.postId || '',
  userId: data.userId || '',
  authorName: data.authorName || '',
  authorPhotoUrl: data.authorPhotoUrl || null,
  content: data.content || '',
  createdAt: data.timestamp || new Date().toISOString(),
  likesCount: data.likesCount || 0,
  isLikedByUser: data.isLikedByUser || false // Computed
});
