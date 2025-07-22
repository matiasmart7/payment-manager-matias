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
import { db } from '../firebase';

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

// ✅ APROBAR USUARIO (Solo Admin) - Con datos de perfil
export const approveUser = async (registrationId, userData, assignedRole = 'user', adminEmail) => {
  try {
    const pendingDoc = await getDoc(doc(db, 'pending_registrations', registrationId));
    
    if (!pendingDoc.exists()) {
      return {
        success: false,
        error: 'Solicitud no encontrada'
      };
    }

    const pendingData = pendingDoc.data();

    // 1. Crear usuario en colección users con datos de perfil
    await setDoc(doc(db, 'users', userData.email), {
      email: userData.email,
      role: assignedRole,
      status: 'approved',
      firstName: pendingData.firstName || 'Usuario',
      lastName: pendingData.lastName || 'Nuevo',
      gender: pendingData.gender || 'M',
      createdAt: userData.requestedAt,
      approvedBy: adminEmail,
      approvedAt: new Date().toISOString()
    });

    // 2. Eliminar de solicitudes pendientes
    await deleteDoc(doc(db, 'pending_registrations', registrationId));

    return {
      success: true,
      message: `Usuario ${pendingData.firstName} ${pendingData.lastName} aprobado como ${assignedRole}`
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

// 📝 EDITAR PERFIL DE USUARIO (Solo Admin)
export const updateUserProfile = async (userEmail, profileData, adminEmail) => {
  try {
    const userRef = doc(db, 'users', userEmail);
    
    await updateDoc(userRef, {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      gender: profileData.gender,
      updatedBy: adminEmail,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Perfil de ${profileData.firstName} ${profileData.lastName} actualizado`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 🔒 CAMBIAR ESTADO DE USUARIO (Solo Admin)
export const changeUserStatus = async (userEmail, newStatus, adminEmail) => {
  try {
    const userRef = doc(db, 'users', userEmail);
    
    await updateDoc(userRef, {
      status: newStatus,
      statusChangedBy: adminEmail,
      statusChangedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Usuario ${userEmail} marcado como ${newStatus}`
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

// 🗑️ ELIMINAR USUARIO COMPLETO (Solo Admin)
export const deleteUser = async (userEmail) => {
  try {
    // 1. Eliminar de Firestore (datos del usuario)
    await deleteDoc(doc(db, 'users', userEmail));
    
    // 2. Eliminar sus pagos también
    try {
      // Intentar eliminar la subcolección de pagos
      const { getDocs, collection } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const userPaymentsRef = collection(db, 'payments', userEmail, 'userPayments');
      const paymentsSnapshot = await getDocs(userPaymentsRef);
      
      // Eliminar cada pago individual
      const deletePromises = paymentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`✅ Pagos eliminados para ${userEmail}`);
    } catch (paymentError) {
      console.log(`⚠️ No se encontraron pagos para ${userEmail} o error al eliminar:`, paymentError);
    }

    return {
      success: true,
      message: `Usuario ${userEmail} eliminado completamente (datos y pagos)`,
      warning: 'NOTA: El email aún existe en Firebase Auth. Para re-registrar el mismo email, debe crearse con contraseña diferente o contactar al administrador.'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
