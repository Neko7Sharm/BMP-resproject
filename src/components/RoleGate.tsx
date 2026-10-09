'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/lib/authTypes';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireEdit?: boolean;
  fallback?: React.ReactNode;
}

export default function RoleGate({
  children,
  allowedRoles,
  requireEdit = false,
  fallback = null,
}: RoleGateProps) {
  const { role, canEdit } = useAuth();

  if (!role) return <>{fallback}</>;
  if (requireEdit && !canEdit) return <>{fallback}</>;
  if (allowedRoles && !allowedRoles.includes(role)) return <>{fallback}</>;

  return <>{children}</>;
}
