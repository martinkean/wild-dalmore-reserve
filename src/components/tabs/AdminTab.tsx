import React, { useState, useEffect } from 'react';
import { Users, Download, Trash2, Shield, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Profile, Track, WeedPatch, Photo } from '../../types';

export const AdminTab: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState({
    tracks: 0,
    weedPatches: 0,
    photos: 0
  });
  const [loading, setLoading] = useState(true);

  const { isAdmin, user: currentUser } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      loadProfiles();
      loadStats();
    }
  }, [isAdmin]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadStats = async () => {
    try {
      const [tracksResult, weedPatchesResult, photosResult] = await Promise.all([
        supabase.from('tracks').select('id', { count: 'exact', head: true }),
        supabase.from('weed_patches').select('id', { count: 'exact', head: true }),
        supabase.from('photos').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        tracks: tracksResult.count || 0,
        weedPatches: weedPatchesResult.count || 0,
        photos: photosResult.count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'Editor' | 'Admin') => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      alert('User role updated successfully!');
      loadProfiles();
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    // Prevent admin from deleting themselves
    if (userId === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }

    const confirmMessage = `Are you sure you want to permanently delete user "${userName}"?\n\nThis will remove:\n- Their profile\n- All their tracks, weed patches, and photos\n- All data associated with this user\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;

    // Double confirmation for destructive action
    if (!confirm('This is your final warning. This action is PERMANENT. Are you absolutely sure?')) return;

    try {
      // First, delete the user's profile (this will cascade to delete their data due to foreign key constraints)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Note: Deleting from auth.users requires admin service role key
      // For now, we'll just delete the profile which effectively disables the user
      // The auth.users record will remain but they won't be able to use the app
      
      alert(`User "${userName}" has been removed from the system successfully.`);
      loadProfiles();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };
  const exportTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          profile:profiles(full_name)
        `);

      if (error) throw error;

      // Generate GPX content for all tracks
      let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Dalmore Reserve Management">
  <metadata>
    <name>Dalmore Reserve Tracks</name>
    <desc>Exported tracks from Dalmore Reserve Management System</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
`;

      data.forEach((track: Track) => {
        gpxContent += `  <trk>
    <name>${track.name}</name>
    <desc>Created by ${track.profile?.full_name} on ${new Date(track.created_at).toLocaleDateString()}</desc>
    <trkseg>
`;
        track.coordinates.forEach(coord => {
          gpxContent += `      <trkpt lat="${coord.lat}" lon="${coord.lng}"></trkpt>
`;
        });
        gpxContent += `    </trkseg>
  </trk>
`;
      });

      gpxContent += `</gpx>`;

      // Download GPX file
      const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dalmore-reserve-tracks-${new Date().toISOString().split('T')[0]}.gpx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting tracks:', error);
      alert('Failed to export tracks');
    }
  };

  const exportWeedPatches = async () => {
    try {
      const { data, error } = await supabase
        .from('weed_patches')
        .select(`
          *,
          profile:profiles(full_name)
        `);

      if (error) throw error;

      // Generate CSV content
      const csvHeader = 'ID,Created By,Latitude,Longitude,Diameter (m),Status,Notes,Created Date,Updated Date\n';
      const csvContent = data.map((patch: WeedPatch) => {
        return [
          patch.id,
          `"${patch.profile?.full_name || ''}"`,
          patch.center_lat,
          patch.center_lng,
          patch.diameter,
          patch.status,
          `"${patch.notes || ''}"`,
          new Date(patch.created_at).toISOString(),
          new Date(patch.updated_at).toISOString()
        ].join(',');
      }).join('\n');

      // Download CSV file
      const blob = new Blob([csvHeader + csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dalmore-reserve-weed-patches-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting weed patches:', error);
      alert('Failed to export weed patches');
    }
  };

  const exportPhotos = async () => {
    alert('Photo export functionality would require server-side processing to create zip files. This would typically be implemented using a cloud function or backend service.');
  };

  if (!isAdmin) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <Shield className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>Only administrators can access this section.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Panel</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Tracks</p>
                <p className="text-2xl font-bold text-blue-900">{stats.tracks}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Weed Patches</p>
                <p className="text-2xl font-bold text-orange-900">{stats.weedPatches}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Photos</p>
                <p className="text-2xl font-bold text-purple-900">{stats.photos}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Data Export */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={exportTracks}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              style={{ minHeight: '44px' }}
            >
              <Download className="h-4 w-4" />
              Export Tracks (GPX)
            </button>
            <button
              onClick={exportWeedPatches}
              className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 flex items-center justify-center gap-2"
              style={{ minHeight: '44px' }}
            >
              <Download className="h-4 w-4" />
              Export Weeds (CSV)
            </button>
            <button
              onClick={exportPhotos}
              className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 flex items-center justify-center gap-2"
              style={{ minHeight: '44px' }}
            >
              <Download className="h-4 w-4" />
              Export Photos (ZIP)
            </button>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management ({profiles.length} users)
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {profiles.map((profile) => (
              <div key={profile.id} className="p-4 border-b border-gray-100 last:border-b-0">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{profile.full_name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        profile.role === 'Admin' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {profile.role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{profile.email}</p>
                    <p className="text-xs text-gray-500">
                      Joined: {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {profile.role === 'Editor' ? (
                      <button
                        onClick={() => updateUserRole(profile.id, 'Admin')}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm flex items-center gap-1"
                        style={{ minHeight: '32px' }}
                      >
                        <Shield className="h-3 w-3" />
                        Make Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => updateUserRole(profile.id, 'Editor')}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm flex items-center gap-1"
                        style={{ minHeight: '32px' }}
                      >
                        <User className="h-3 w-3" />
                        Make Editor
                      </button>
                    )}
                    
                    {/* Delete User Button - Only show if not current user */}
                    {profile.id !== currentUser?.id && (
                      <button
                        onClick={() => deleteUser(profile.id, profile.full_name)}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center gap-1"
                        style={{ minHeight: '32px' }}
                        title="Delete User (Permanent)"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};