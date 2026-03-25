import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from './ui/Toast';
import usersService, { User, UserFilters } from '../services/users';

interface CurrentUserShape {
  id: string | number;
  role: string;
}

interface UserManagementProps {
  currentUser: CurrentUserShape;
}

const ROLES = [
  { value: 'CLIENT', label: 'Client', color: 'bg-blue-100 text-blue-800' },
  { value: 'AGENT', label: 'Agent', color: 'bg-green-100 text-green-800' },
  { value: 'ADMIN', label: 'Admin', color: 'bg-purple-100 text-purple-800' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'bg-red-100 text-red-800' },
];

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', company: '', role: '' });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const filters: UserFilters = { page, limit: 20 };
      if (search) filters.search = search;
      if (roleFilter) filters.role = roleFilter;

      const response = await usersService.getUsers(filters);
      setUsers(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error: any) {
      addToast(error.message || 'Eroare la încărcarea utilizatorilor', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditData({
      name: user.name,
      phone: user.phone || '',
      company: user.company || '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      await usersService.updateUser(selectedUser.id, editData);
      addToast('Utilizator actualizat cu succes', 'success');
      setShowEditModal(false);
      // Auto-refresh after successful save
      await fetchUsers();
    } catch (error: any) {
      addToast(error.message || 'Eroare la salvare', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Sigur doriți să resetați parola pentru ${user.email}?`)) return;

    try {
      await usersService.resetPassword(user.id);
      addToast('Parola a fost resetată. Utilizatorul va primi un email.', 'success');
    } catch (error: any) {
      addToast(error.message || 'Eroare la resetarea parolei', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      await usersService.deleteUser(selectedUser.id);
      addToast('Utilizator șters cu succes', 'success');
      setShowDeleteModal(false);
      // Auto-refresh after successful delete
      await fetchUsers();
    } catch (error: any) {
      addToast(error.message || 'Eroare la ștergere', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    return ROLES.find((r) => r.value === role)?.color || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
          Gestionare Utilizatori
        </h1>
        <span className="text-sm text-neutral-500">Total: {total} utilizatori</span>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Caută după email, nume sau companie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm"
          >
            <option value="">Toate rolurile</option>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <Button type="submit">Caută</Button>
        </form>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">Nu s-au găsit utilizatori</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Utilizator
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Companie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Ultima autentificare
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {user.name}
                        </div>
                        <div className="text-sm text-neutral-500">{user.email}</div>
                        {user.phone && <div className="text-xs text-neutral-400">{user.phone}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}
                      >
                        {ROLES.find((r) => r.value === user.role)?.label || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {user.company || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {user.emailVerified ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                            Verificat
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                            Neverificat
                          </span>
                        )}
                        {user.twoFactorEnabled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                            2FA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(user)}>
                          Editează
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResetPassword(user)}
                        >
                          Reset Parolă
                        </Button>
                        {user.id !== currentUser.id && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                          >
                            Șterge
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
            <div className="text-sm text-neutral-500">
              Pagina {page} din {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Următor
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <h3 className="text-lg font-semibold mb-4">Editează Utilizator</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input value={selectedUser.email} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nume</label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefon</label>
                <Input
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Companie</label>
                <Input
                  value={editData.company}
                  onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rol</label>
                <select
                  value={editData.role}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md"
                >
                  {ROLES.map((role) => {
                    // Only SUPER_ADMIN can assign/change SUPER_ADMIN role
                    const isSuperAdminRole = role.value === 'SUPER_ADMIN';
                    const canAssignSuperAdmin = currentUser.role === 'SUPER_ADMIN';
                    const disabled = isSuperAdminRole && !canAssignSuperAdmin;

                    return (
                      <option key={role.value} value={role.value} disabled={disabled}>
                        {role.label}
                        {disabled ? ' (doar pentru SUPER_ADMIN)' : ''}
                      </option>
                    );
                  })}
                </select>
                {currentUser.role !== 'SUPER_ADMIN' && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Doar SUPER_ADMIN poate modifica rolul SUPER_ADMIN
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Anulează
              </Button>
              <Button onClick={handleSaveUser} loading={saving}>
                Salvează
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Șterge Utilizator</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Sigur doriți să ștergeți utilizatorul <strong>{selectedUser.email}</strong>? Această
              acțiune nu poate fi anulată.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Anulează
              </Button>
              <Button variant="danger" onClick={handleDeleteUser} loading={saving}>
                Șterge
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
