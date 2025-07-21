import React, { useState, useEffect } from 'react';
import { 
  getPendingRegistrations, 
  approveUser, 
  rejectUser, 
  getAllUsers,
  changeUserRole,
  deleteUser 
} from '../services/adminService';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  Crown,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';

const AdminPanel = ({ currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar datos
  const loadPendingUsers = async () => {
    setLoading(true);
    const result = await getPendingRegistrations();
    if (result.success) {
      setPendingUsers(result.pendingUsers);
    }
    setLoading(false);
  };

  const loadAllUsers = async () => {
    setLoading(true);
    const result = await getAllUsers();
    if (result.success) {
      setAllUsers(result.users);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingUsers();
    } else if (activeTab === 'users') {
      loadAllUsers();
    }
  }, [activeTab]);

  // Aprobar usuario
  const handleApprove = async (registrationId, userData, role = 'user') => {
    const result = await approveUser(registrationId, userData, role, currentUser.email);
    if (result.success) {
      alert(`✅ ${userData.email} aprobado como ${role}`);
      loadPendingUsers();
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  };

  // Rechazar usuario
  const handleReject = async (registrationId, email) => {
    if (confirm(`¿Rechazar solicitud de ${email}?`)) {
      const result = await rejectUser(registrationId);
      if (result.success) {
        alert(`❌ Solicitud de ${email} rechazada`);
        loadPendingUsers();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    }
  };

  // Cambiar rol
  const handleRoleChange = async (userEmail, newRole) => {
    if (userEmail === currentUser.email) {
      alert('No puedes cambiar tu propio rol');
      return;
    }

    const result = await changeUserRole(userEmail, newRole, currentUser.email);
    if (result.success) {
      alert(`✅ Rol de ${userEmail} cambiado a ${newRole}`);
      loadAllUsers();
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userEmail) => {
    if (userEmail === currentUser.email) {
      alert('No puedes eliminar tu propia cuenta');
      return;
    }

    if (confirm(`¿Eliminar usuario ${userEmail}? Esta acción no se puede deshacer.`)) {
      const result = await deleteUser(userEmail);
      if (result.success) {
        alert(`🗑️ Usuario ${userEmail} eliminado`);
        loadAllUsers();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center gap-3">
            <Crown size={24} />
            <div>
              <h2 className="text-xl font-bold">Panel de Administración</h2>
              <p className="text-sm opacity-90">Gestión de usuarios y permisos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-medium flex items-center gap-2 ${
              activeTab === 'pending' 
                ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Clock size={18} />
            Solicitudes Pendientes ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium flex items-center gap-2 ${
              activeTab === 'users' 
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Users size={18} />
            Usuarios Registrados ({allUsers.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          
          {/* Solicitudes Pendientes */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Cargando solicitudes...</p>
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No hay solicitudes pendientes</p>
                </div>
              ) : (
                pendingUsers.map((user) => (
                  <div key={user.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-800">{user.email}</h3>
                        <p className="text-sm text-gray-600">
                          Solicitado: {new Date(user.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <select
                          className="px-3 py-1 border rounded text-sm"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleApprove(user.id, user, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Aprobar como...</option>
                          <option value="user">👤 Usuario</option>
                          <option value="admin">👑 Admin</option>
                        </select>
                        <button
                          onClick={() => handleReject(user.id, user.email)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                        >
                          <XCircle size={14} /> Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Usuarios Registrados */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Cargando usuarios...</p>
                </div>
              ) : (
                allUsers.map((user) => (
                  <div key={user.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                          {user.role === 'admin' ? (
                            <Crown className="text-purple-600" size={18} />
                          ) : (
                            <Users className="text-blue-600" size={18} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            {user.email}
                            {user.email === currentUser.email && (
                              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                                Tú
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-600' 
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {user.role === 'admin' ? '👑 Admin' : '👤 Usuario'}
                            </span>
                            <span>Creado: {new Date(user.createdAt).toLocaleDateString()}</span>
                            {user.approvedBy && (
                              <span>Aprobado por: {user.approvedBy}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {user.email !== currentUser.email && (
                        <div className="flex gap-2">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.email, e.target.value)}
                            className="px-3 py-1 border rounded text-sm"
                          >
                            <option value="user">👤 Usuario</option>
                            <option value="admin">👑 Admin</option>
                          </select>
                          <button
                            onClick={() => handleDeleteUser(user.email)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;