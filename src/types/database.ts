export interface Movie {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  video_url: string | null;
  category: string | null;
  duration: string | null;
  release_year: number | null;
  rating: string | null;
  is_featured: boolean;
  created_at: string;
}

export interface Series {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  category: string | null;
  release_year: number | null;
  rating: string | null;
  is_featured: boolean;
  created_at: string;
}

export interface Episode {
  id: string;
  series_id: string;
  season: number;
  episode: number;
  title: string | null;
  description: string | null;
  video_url: string | null;
  thumbnail: string | null;
  duration: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  movie_id: string | null;
  episode_id: string | null;
  user_name: string;
  text: string;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export type ContentType = 'movie' | 'series';
