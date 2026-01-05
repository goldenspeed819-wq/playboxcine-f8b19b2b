// Centralized categories for movies and series
export const CATEGORIES = [
  'Ação',
  'Aventura',
  'Animação',
  'Biografia',
  'Comédia',
  'Crime',
  'Documentário',
  'Drama',
  'Família',
  'Fantasia',
  'Ficção Científica',
  'Guerra',
  'História',
  'Infantil',
  'Mistério',
  'Musical',
  'Romance',
  'Suspense',
  'Terror',
  'Thriller',
  'Faroeste',
  'Esporte',
  'Super-Herói',
  'Anime',
  'K-Drama',
  'Reality Show',
  'Talk Show',
  'Sitcom',
  'Policial',
  'Sobrenatural',
] as const;

// Ratings for content classification
export const RATINGS = ['Livre', '10', '12', '14', '16', '18'] as const;

export type Category = typeof CATEGORIES[number];
export type Rating = typeof RATINGS[number];
