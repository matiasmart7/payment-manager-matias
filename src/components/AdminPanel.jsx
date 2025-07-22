import React, { useState, useEffect } from 'react';
import { 
  getPendingRegistrations, 
  approveUser, 
  rejectUser, 
  getAllUsers,
  changeUserRole,
  deleteUser,
  updateUserProfile,
  changeUserStatus
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
  Settings,
  Edit,
  Save,
  X as CloseIcon,
  Lock
} from 'lucide-react';

const AdminPanel = ({ currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'M'
  });

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

  // Cambiar estado
  const handleStatusChange = async (userEmail, newStatus) => {
    if (userEmail === currentUser.email) {
      alert('No puedes cambiar tu propio estado');
      return;
    }

    const result = await changeUserStatus(userEmail, newStatus, currentUser.email);
    if (result.success) {
      alert(`✅ Estado de ${userEmail} cambiado a ${newStatus}`);
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

    if (confirm(`¿Eliminar usuario ${userEmail}? 

⚠️ IMPORTANTE: Esto eliminará:
- Sus datos de perfil
- Todos sus pagos
- Su acceso al sistema

Nota: El email seguirá registrado en Firebase Auth.`)) {
      const result = await deleteUser(userEmail);
      if (result.success) {
        alert(`🗑️ Usuario ${userEmail} eliminado`);
        loadAllUsers();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    }
  };

  // Abrir edición de perfil
  const openEditProfile = (user) => {
    setEditingUser(user.email);
    setEditFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      gender: user.gender || 'M'
    });
  };

  // Guardar edición de perfil
  const handleSaveProfile = async () => {
    const result = await updateUserProfile(editingUser, editFormData, currentUser.email);
    if (result.success) {
      alert(`✅ ${result.message}`);
      setEditingUser(null);
      loadAllUsers();
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  };

  // Cancelar edición
  const cancelEdit = () => {
    setEditingUser(null);
    setEditFormData({ firstName: '', lastName: '', gender: 'M' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        
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
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Nombre: {user.firstName} {user.lastName}</p>
                          <p>Sexo: {user.gender === 'M' ? 'Masculino' : 'Femenino'}</p>
                          <p>Solicitado: {new Date(user.requestedAt).toLocaleString()}</p>
                        </div>
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
                    {editingUser === user.email ? (
                      // Modo edición
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
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
                            <h3 className="font-semibold text-gray-800">{user.email}</h3>
                            <p className="text-sm text-gray-500">Editando perfil</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                              type="text"
                              value={editFormData.firstName}
                              onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nombre"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                            <input
                              type="text"
                              value={editFormData.lastName}
                              onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Apellido"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                            <select
                              value={editFormData.gender}
                              onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="M">Masculino</option>
                              <option value="F">Femenino</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveProfile}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center gap-1"
                          >
                            <Save size={14} /> Guardar
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded text-sm flex items-center gap-1"
                          >
                            <CloseIcon size={14} /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo vista
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
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                              {user.email}
                              {user.email === currentUser.email && (
                                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                                  Tú
                                </span>
                              )}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-600' 
                                  : 'bg-blue-100 text-blue-600'
                              }`}>
                                {user.role === 'admin' ? '👑 Admin' : '👤 Usuario'}
                              </span>
                              
                              {/* Estado con desplegable */}
                              <div className="flex items-center gap-2">
                                <span>Estado:</span>
                                <select
                                  value={user.status}
                                  onChange={(e) => handleStatusChange(user.email, e.target.value)}
                                  disabled={user.email === currentUser.email}
                                  className={`text-xs px-2 py-0.5 rounded-full border-0 ${
                                    user.status === 'approved' ? 'bg-green-100 text-green-600' :
                                    user.status === 'blocked' ? 'bg-red-100 text-red-600' :
                                    'bg-gray-100 text-gray-600'
                                  } ${user.email === currentUser.email ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                >
                                  <option value="approved">✅ Activo</option>
                                  <option value="blocked">🚫 Bloqueado</option>
                                </select>
                              </div>
                              
                              {user.firstName && (
                                <span>Nombre: {user.firstName} {user.lastName}</span>
                              )}
                              <span>Creado: {new Date(user.createdAt).toLocaleDateString()}</span>
                              {user.approvedBy && (
                                <span>Aprobado por: {user.approvedBy}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {user.email !== currentUser.email && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditProfile(user)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                            >
                              <Edit size={14} /> Editar
                            </button>
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
                    )}
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