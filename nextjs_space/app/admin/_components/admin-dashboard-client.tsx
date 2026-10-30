'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Crown, Users, Gamepad2, Plus, Trash2, Edit, Upload, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SafeDate } from '@/components/safe-format';

type User = {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
};

type Game = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cloudStoragePath: string | null;
  uploadedAt: string;
  uploader: { username: string } | null;
  _count: { scores: number };
};

export function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<'users' | 'games'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingGames, setLoadingGames] = useState(true);

  // New user form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user' });
  const [addingUser, setAddingUser] = useState(false);

  // Game upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ name: '', slug: '', description: '' });
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Edit role
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    } catch { /* */ }
    setLoadingUsers(false);
  }, []);

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/games');
      if (res.ok) setGames(await res.json());
    } catch { /* */ }
    setLoadingGames(false);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchGames();
  }, [fetchUsers, fetchGames]);

  async function addUser() {
    setAddingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (res.ok) {
        toast?.success?.('User created');
        setShowAddUser(false);
        setNewUser({ username: '', email: '', password: '', role: 'user' });
        fetchUsers();
      } else {
        toast?.error?.(data?.error ?? 'Failed');
      }
    } catch {
      toast?.error?.('Failed to add user');
    }
    setAddingUser(false);
  }

  async function updateRole(userId: string, role: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        toast?.success?.('Role updated');
        setEditingRole(null);
        fetchUsers();
      } else {
        toast?.error?.('Failed to update role');
      }
    } catch {
      toast?.error?.('Error');
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast?.success?.('User deleted');
        fetchUsers();
      } else {
        const data = await res.json();
        toast?.error?.(data?.error ?? 'Failed');
      }
    } catch {
      toast?.error?.('Error');
    }
  }

  async function uploadGame() {
    if (!uploadFile || !uploadForm.name || !uploadForm.slug) {
      toast?.error?.('Name, slug, and file are required');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', uploadForm.name);
      formData.append('slug', uploadForm.slug);
      formData.append('description', uploadForm.description);

      const res = await fetch('/api/admin/games/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        toast?.success?.(`Game uploaded! ${data?.filesUploaded ?? 0} files extracted.`);
        setShowUpload(false);
        setUploadFile(null);
        setUploadForm({ name: '', slug: '', description: '' });
        fetchGames();
      } else {
        toast?.error?.(data?.error ?? 'Upload failed');
      }
    } catch {
      toast?.error?.('Upload failed');
    }
    setUploading(false);
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3 mb-2">
          <Crown className="w-8 h-8 text-amber-400" /> Admin Dashboard
        </h1>
        <p className="text-muted-foreground mb-8">Manage users, games, and platform settings</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'users' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            <Users className="w-4 h-4" /> Users ({users?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'games' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            <Gamepad2 className="w-4 h-4" /> Games ({games?.length ?? 0})
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                {showAddUser ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddUser ? 'Cancel' : 'Add User'}
              </button>
            </div>

            {showAddUser && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-card rounded-xl p-4 border border-border mb-4 shadow-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    placeholder="Username"
                    value={newUser.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, username: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    placeholder="Email"
                    type="email"
                    value={newUser.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, email: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    placeholder="Password"
                    type="password"
                    value={newUser.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, password: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={newUser.role}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewUser({ ...newUser, role: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  onClick={addUser}
                  disabled={addingUser}
                  className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {addingUser ? 'Creating...' : 'Create User'}
                </button>
              </motion.div>
            )}

            {loadingUsers ? (
              <div className="space-y-2">{[1, 2, 3].map((i: number) => <div key={i} className="h-14 bg-card rounded-xl animate-pulse" />)}</div>
            ) : (
              <div className="space-y-2">
                {(users ?? []).map((user: User) => (
                  <div key={user.id} className="bg-card rounded-xl p-4 shadow-md border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        user.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/10 text-primary'
                      }`}>
                        {user.username?.[0]?.toUpperCase?.() ?? '?'}
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {user.username}
                          {user.role === 'admin' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingRole === user.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={newRole}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewRole(e.target.value)}
                            className="px-2 py-1 rounded bg-secondary border border-border text-xs"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button onClick={() => updateRole(user.id, newRole)} className="p-1 rounded hover:bg-green-500/20 text-green-400">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingRole(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className={`text-xs px-2 py-1 rounded-md ${
                            user.role === 'admin' ? 'bg-amber-500/10 text-amber-400' : 'bg-secondary text-muted-foreground'
                          }`}>
                            {user.role}
                          </span>
                          <button
                            onClick={() => { setEditingRole(user.id); setNewRole(user.role); }}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                {showUpload ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {showUpload ? 'Cancel' : 'Upload Game'}
              </button>
            </div>

            {showUpload && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-card rounded-xl p-4 border border-border mb-4 shadow-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    placeholder="Game Name"
                    value={uploadForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadForm({ ...uploadForm, name: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    placeholder="Slug (lowercase, hyphens)"
                    value={uploadForm.slug}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadForm({ ...uploadForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    placeholder="Description (optional)"
                    value={uploadForm.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:col-span-2"
                  />
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-muted-foreground mb-1">ZIP file (max 100MB)</label>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadFile(e.target.files?.[0] ?? null)}
                    className="text-sm text-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-secondary file:text-foreground file:font-medium file:cursor-pointer hover:file:bg-secondary/80"
                  />
                </div>
                <button
                  onClick={uploadGame}
                  disabled={uploading}
                  className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? 'Uploading...' : 'Upload & Extract'}
                </button>
              </motion.div>
            )}

            {loadingGames ? (
              <div className="space-y-2">{[1, 2].map((i: number) => <div key={i} className="h-14 bg-card rounded-xl animate-pulse" />)}</div>
            ) : (
              <div className="space-y-2">
                {(games ?? []).map((game: Game) => (
                  <div key={game.id} className="bg-card rounded-xl p-4 shadow-md border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Gamepad2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{game.name}</div>
                        <div className="text-xs text-muted-foreground">
                          /{game.slug} • {game.uploader?.username ?? 'system'} • <SafeDate date={game.uploadedAt} options={{ dateStyle: 'medium' }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {game.cloudStoragePath ? (
                        <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-md">Playable</span>
                      ) : (
                        <span className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-md">Built-in</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
