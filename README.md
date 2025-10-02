# Dalmore Reserve - Bushland Management App

A mobile-first Progressive Web App (PWA) for managing bushland conservation activities at Dalmore Reserve. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Interactive Map**: Real-time GPS tracking with OpenStreetMap integration
- **Track Management**: Record GPS tracks for maintenance routes and surveys
- **Weed Management**: Mark and track weed patches with status updates
- **Photo Documentation**: Geo-tagged photo capture and management
- **User Management**: Role-based access (Editor/Admin) with secure authentication
- **Offline Support**: Service Worker with map tile caching for offline use
- **PWA**: Installable on mobile devices with native-like experience

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Maps**: Leaflet, React-Leaflet, OpenStreetMap
- **Backend**: Supabase (Authentication, Database, Real-time subscriptions)
- **Images**: Cloudinary (Upload, optimization, CDN)
- **Deployment**: Netlify
- **PWA**: Service Worker, Web App Manifest

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account and project
- Cloudinary account

### Installation

1. Clone the repository
```bash
git clone [your-repo-url]
cd dalmore-reserve
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

4. Set up the database
Run the SQL migrations in your Supabase SQL Editor (in order):
- `supabase/migrations/20250928041100_curly_meadow.sql`
- `supabase/migrations/20250928041116_super_lantern.sql`
- `supabase/migrations/20250928041121_black_valley.sql`
- `supabase/migrations/20250928041130_rustic_river.sql`

5. Start the development server
```bash
npm run dev
```

### Deployment

The app is configured for deployment on Netlify:

1. Push to GitHub
2. Connect your GitHub repo to Netlify
3. Set environment variables in Netlify dashboard
4. Deploy

The `netlify.toml` configuration handles:
- Build settings
- Client-side routing redirects
- Security headers
- Camera/location permissions
- Asset caching

## Usage

### First User Setup
1. Sign up for an account
2. The first user is automatically assigned Admin role
3. Admin users can promote other users to Admin in the Admin tab

### Core Features
- **Map Tab**: View reserve boundary, GPS tracks, weed patches, and photos
- **Tracks Tab**: Create GPS tracks by recording routes or adding waypoints
- **Weeds Tab**: Mark circular weed patches with diameter and status
- **Photos Tab**: Take geo-tagged photos at current location
- **Admin Tab**: User management and data export (Admin only)

## Database Schema

- **profiles**: User accounts with roles (Editor/Admin)
- **tracks**: GPS coordinate arrays with metadata
- **weed_patches**: Circular areas with center point, diameter, and status
- **photos**: Geo-tagged images with Cloudinary URLs

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based permissions (Editor can manage own data, Admin can manage all)
- Secure authentication with Supabase Auth
- HTTPS required for GPS and camera features

## Offline Support

- Service Worker caches map tiles for Dalmore Reserve area
- Static assets cached for offline use
- Background sync for data when connection restored

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers with GPS and camera support

## Development

### Key Files
- `src/components/tabs/`: Main app sections
- `src/components/map/`: Map-related components
- `src/hooks/`: Custom hooks for GPS, Cloudinary, etc.
- `src/types/`: TypeScript type definitions
- `public/sw.js`: Service Worker for offline functionality

### Environment Variables
All environment variables must be prefixed with `VITE_` for Vite to expose them to the client.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on mobile devices
5. Submit a pull request

## License

This project is licensed under the MIT License.