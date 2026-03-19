export type ProviderServiceType = 'Hotel' | 'Spa' | 'Restaurant' | 'Venue' | 'Experience'

export interface DateProviderCard {
  id: string
  name: string
  type: ProviderServiceType
  location: string
  rating: number
  /** Placeholder image URL */
  imageUrl: string
}

/** Dummy listings until real provider data is wired up */
export const DATE_PROVIDER_PLACEHOLDERS: DateProviderCard[] = [
  {
    id: '1',
    name: 'The Grand Riverside',
    type: 'Hotel',
    location: 'London, UK',
    rating: 4.8,
    imageUrl:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  },
  {
    id: '2',
    name: 'Serenity Spa & Wellness',
    type: 'Spa',
    location: 'Manchester, UK',
    rating: 4.9,
    imageUrl:
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80',
  },
  {
    id: '3',
    name: 'Lumière Dining',
    type: 'Restaurant',
    location: 'Birmingham, UK',
    rating: 4.7,
    imageUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  },
  {
    id: '4',
    name: 'Skyline Rooftop Venue',
    type: 'Venue',
    location: 'Edinburgh, UK',
    rating: 4.6,
    imageUrl:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  },
  {
    id: '5',
    name: 'Coastal Escape Experiences',
    type: 'Experience',
    location: 'Brighton, UK',
    rating: 4.85,
    imageUrl:
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  },
]
