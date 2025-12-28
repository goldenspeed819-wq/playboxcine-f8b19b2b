export interface Subtitle {
  id: string;
  movie_id: string | null;
  episode_id: string | null;
  language: string;
  subtitle_url: string;
  created_at: string;
}
