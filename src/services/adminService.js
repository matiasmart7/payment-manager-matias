// 🔥 services/adminService.js - Nuevo archivo para funciones admin

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// 📋 GESTIÓN DE USUARIOS
export const getUserRole = async (email) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', email));
    if (userDoc.exists()) {
      return {
        success: true,
        user: userDoc.data()
      };
    }
    return {
      success: false,
      error: 'Usuario no encontrado'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 🔍 OBTENER SOLICITUDES PENDIENTES (Solo Admin)
export const getPendingRegistrations = async () => {
  try {
    const q = query(
      collection(db, 'pending_registrations'),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    
    const pendingUsers = [];
    querySnapshot.forEach((doc) => {
      pendingUsers.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return {
      success: true,
      pendingUsers
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// ✅ APROBAR USUARIO (Solo Admin)
export const approveUser = async (registrationId, userData, assignedRole = 'user', adminEmail) => {
  try {
    // 1. Crear usuario en colección users
    await setDoc(doc(db, 'users', userData.email), {
      email: userData.email,
      role: assignedRole,
      status: 'approved',
      createdAt: userData.requestedAt,
      approvedBy: adminEmail,
      approvedAt: new Date().toISOString()
    });

    // 2. Eliminar de solicitudes pendientes
    await deleteDoc(doc(db, 'pending_registrations', registrationId));

    return {
      success: true,
      message: `Usuario ${userData.email} aprobado como ${assignedRole}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// ❌ RECHAZAR USUARIO (Solo Admin)
export const rejectUser = async (registrationId, reason = '') => {
  try {
    // Solo eliminar de solicitudes pendientes
    await deleteDoc(doc(db, 'pending_registrations', registrationId));

    return {
      success: true,
      message: 'Usuario rechazado'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 👥 OBTENER TODOS LOS USUARIOS (Solo Admin)
export const getAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return {
      success: true,
      users
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 🔄 CAMBIAR ROL DE USUARIO (Solo Admin)
export const changeUserRole = async (userEmail, newRole, adminEmail) => {
  try {
    await updateDoc(doc(db, 'users', userEmail), {
      role: newRole,
      lastModifiedBy: adminEmail,
      lastModifiedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Rol de ${userEmail} cambiado a ${newRole}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 🗑️ ELIMINAR USUARIO (Solo Admin)
export const deleteUser = async (userEmail) => {
  try {
    // Eliminar datos del usuario
    await deleteDoc(doc(db, 'users', userEmail));
    
    // TODO: También eliminar sus pagos
    // await deleteDoc(doc(db, 'payments', userEmail));

    return {
      success: true,
      message: `Usuario ${userEmail} eliminado`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};