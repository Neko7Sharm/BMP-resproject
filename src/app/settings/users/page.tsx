'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Lock,
  RefreshCw,
  Search,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole, ROLE_CONFIG } from '@/lib/authTypes';

interface UserItem {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UserManagementPage() {
  const { user: currentUser, isAdmin, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<UserItem | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<UserItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<UserItem | null>(null);

  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('STORE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('STORE');

  // Password reset form state
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', text: err.error || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchUsers();
    }
  }, [authLoading, isAdmin]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-rose-200 rounded-3xl text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">ไม่มีสิทธิ์เข้าถึง</h2>
        <p className="text-xs text-slate-500">
          หน้านี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (แอดมิน) เท่านั้น
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  // Handle Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newName.trim() || !newPassword) {
      setFeedback({ type: 'error', text: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          name: newName.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'สร้างผู้ใช้ไม่สำเร็จ' });
        return;
      }

      setFeedback({ type: 'success', text: `สร้างบัญชี "${newName}" สำเร็จเรียบร้อย` });
      setShowAddModal(false);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('STORE');
      fetchUsers();
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit User
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal || !editName.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/users/${showEditModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          role: editRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'แก้ไขข้อมูลไม่สำเร็จ' });
        return;
      }

      setFeedback({ type: 'success', text: `อัปเดตข้อมูลผู้ใช้ "${editName}" สำเร็จ` });
      setShowEditModal(null);
      fetchUsers();
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal || !resetPasswordVal.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/users/${showPasswordModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: resetPasswordVal.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'รีเซ็ตรหัสผ่านไม่สำเร็จ' });
        return;
      }

      setFeedback({ type: 'success', text: `รีเซ็ตรหัสผ่านของ @${showPasswordModal.username} เรียบร้อย` });
      setShowPasswordModal(null);
      setResetPasswordVal('');
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleActive = async (targetUser: UserItem) => {
    try {
      const res = await fetch(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !targetUser.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'ปรับสถานะไม่สำเร็จ' });
        return;
      }

      setFeedback({
        type: 'success',
        text: targetUser.isActive
          ? `ระงับบัญชี @${targetUser.username} ชั่วคราว`
          : `เปิดใช้งานบัญชี @${targetUser.username} แล้ว`,
      });
      fetchUsers();
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message });
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/users/${showDeleteModal.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'ลบบัญชีไม่สำเร็จ' });
        return;
      }

      setFeedback({ type: 'success', text: `ลบบัญชี @${showDeleteModal.username} เรียบร้อย` });
      setShowDeleteModal(null);
      fetchUsers();
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter users by search term
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      ROLE_CONFIG[u.role]?.shortLabel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/settings"
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
              title="ย้อนกลับไปหน้าตั้งค่า"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-600" />
              จัดการผู้ใช้งาน & สิทธิ์การเข้าถึง (Accounts)
            </h1>
          </div>
          <p className="text-xs text-slate-500 ml-6">
            สร้างบัญชีพนักงาน กำหนดตำแหน่ง และรีเซ็ตรหัสผ่าน (เฉพาะแอดมิน)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>เพิ่มผู้ใช้ใหม่</span>
          </button>
        </div>
      </div>

      {/* Role Guide Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(ROLE_CONFIG) as UserRole[]).map((rKey) => {
          const cfg = ROLE_CONFIG[rKey];
          const count = users.filter((u) => u.role === rKey).length;
          return (
            <div key={rKey} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-lg">{cfg.icon}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badgeClass}`}>
                  {count} คน
                </span>
              </div>
              <div className="font-bold text-xs text-slate-800">{cfg.label} ({cfg.shortLabel})</div>
              <div className="text-[10px] text-slate-400 line-clamp-2">{cfg.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-start justify-between gap-3 text-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, username หรือตำแหน่ง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
          />
        </div>
        <div className="text-xs text-slate-500">
          พนักงานทั้งหมด <strong className="text-slate-900">{users.length}</strong> บัญชี (เปิดใช้งาน{' '}
          <strong className="text-emerald-700">{users.filter((u) => u.isActive).length}</strong> บัญชี)
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">ชื่อ-นามสกุล / Username</th>
                <th className="px-4 py-3 font-semibold">ตำแหน่งงาน</th>
                <th className="px-4 py-3 font-semibold">สถานะ</th>
                <th className="px-4 py-3 font-semibold">เข้าสู่ระบบล่าสุด</th>
                <th className="px-4 py-3 font-semibold text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {search ? 'ไม่พบผู้ใช้ที่ตรงกับคำค้นหา' : 'ยังไม่มีผู้ใช้งานในระบบ'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const cfg = ROLE_CONFIG[u.role] || {
                    shortLabel: u.role,
                    badgeClass: 'bg-slate-100 text-slate-700',
                    icon: '👤',
                  };
                  const isSelf = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      {/* Name & Username */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name.charAt(0) || u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">
                                  ตัวคุณ
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.badgeClass}`}
                        >
                          <span>{cfg.icon}</span>
                          <span>{cfg.shortLabel}</span>
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => !isSelf && handleToggleActive(u)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          } ${isSelf ? 'cursor-default' : 'cursor-pointer'}`}
                          title={isSelf ? 'ไม่สามารถระงับบัญชีของตนเองได้' : 'คลิกเพื่อสลับสถานะ'}
                        >
                          {u.isActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              เปิดใช้งาน
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              ระงับการใช้งาน
                            </>
                          )}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3.5 text-slate-500 text-[11px] font-mono">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString('th-TH', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'ยังไม่เคยเข้าสู่ระบบ'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Name & Role */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditModal(u);
                              setEditName(u.name);
                              setEditRole(u.role);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition"
                            title="แก้ไขข้อมูล / เปลี่ยนตำแหน่ง"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordModal(u);
                              setResetPasswordVal('');
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition"
                            title="รีเซ็ตรหัสผ่านใหม่"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => setShowDeleteModal(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="ลบบัญชีนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: เพิ่มผู้ใช้ใหม่ ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-600" />
                เพิ่มบัญชีพนักงานใหม่
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้ใช้ (Username ภาษาอังกฤษ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น somchai, user1"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุลจริง
                </label>
                <input
                  type="text"
                  placeholder="เช่น สมชาย ใจดี"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่านเริ่มต้น
                </label>
                <input
                  type="password"
                  placeholder="อย่างน้อย 4 ตัวอักษร"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ตำแหน่ง / สิทธิ์การใช้งาน
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
                >
                  {(Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_CONFIG[r].icon} {ROLE_CONFIG[r].label} ({ROLE_CONFIG[r].shortLabel})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {ROLE_CONFIG[newRole]?.desc}
                </p>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 rounded-xl transition shadow-md shadow-purple-200"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'สร้างบัญชี'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: แก้ไขข้อมูล & ตำแหน่ง ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-purple-600" />
                แก้ไขข้อมูลผู้ใช้ (@{showEditModal.username})
              </h3>
              <button onClick={() => setShowEditModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ตำแหน่ง / สิทธิ์การใช้งาน
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none"
                >
                  {(Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_CONFIG[r].icon} {ROLE_CONFIG[r].label} ({ROLE_CONFIG[r].shortLabel})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {ROLE_CONFIG[editRole]?.desc}
                </p>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 rounded-xl transition shadow-md shadow-purple-200"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: รีเซ็ตรหัสผ่าน ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                รีเซ็ตรหัสผ่าน (@{showPasswordModal.username})
              </h3>
              <button onClick={() => setShowPasswordModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <p className="text-xs text-slate-500">
                ตั้งรหัสผ่านใหม่ให้กับ <strong>{showPasswordModal.name}</strong>
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  placeholder="กรอกรหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || resetPasswordVal.trim().length < 4}
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-xl transition shadow-md shadow-amber-200"
                >
                  {isSubmitting ? 'กำลังเปลี่ยนรหัส...' : 'ยืนยันรหัสผ่านใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: ยืนยันการลบบัญชี ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ยืนยันการลบบัญชีผู้ใช้?</h3>
              <p className="text-xs text-slate-500 mt-1">
                คุณกำลังจะลบบัญชีของ <strong>{showDeleteModal.name}</strong> (@{showDeleteModal.username})
                การกระทำนี้จะถูกบันทึกใน Audit Logs
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded-xl transition shadow-md shadow-rose-200"
              >
                {isSubmitting ? 'กำลังลบ...' : 'ยืนยันลบบัญชี'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
