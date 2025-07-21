// 🔄 services/authService.js - MODIFICADO para sistema de aprobación

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// 📧 REGISTRO MODIFICADO - Crear solicitud pendiente
export const registerUser = async (email, password) => {
  try {
    // 1. Verificar si ya existe solicitud pendiente
    const pendingDoc = await getDoc(doc(db, 'pending_registrations', email));
    if (pendingDoc.exists()) {
      return {
        success: false,
        error: 'Ya existe una solicitud pendiente para este email'
      };
    }

    // 2. Verificar si ya es usuario aprobado
    const userDoc = await getDoc(doc(db, 'users', email));
    if (userDoc.exists()) {
      return {
        success: false,
        error: 'Este email ya está registrado'
      };
    }

    // 3. Solo matiasmart7@gmail.com se auto-aprueba como admin
    if (email === 'matiasmart7@gmail.com') {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Crear como admin directamente
      await setDoc(doc(db, 'users', email), {
        email: email,
        role: 'admin',
        status: 'approved',
        createdAt: new Date().toISOString(),
        approvedBy: 'system',
        approvedAt: new Date().toISOString()
      });

      return {
        success: true,
        user: userCredential.user,
        message: 'Cuenta admin creada exitosamente'
      };
    }

    // 4. Para otros usuarios, crear cuenta pero marcar como pendiente
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Crear solicitud pendiente
    await setDoc(doc(db, 'pending_registrations', email), {
      email: email,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    });

    // Cerrar sesión inmediatamente (no pueden usar la app hasta ser aprobados)
    await signOut(auth);

    return {
      success: true,
      user: null,
      message: 'Solicitud de registro enviada. Espera la aprobación del administrador.',
      requiresApproval: true
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 🔐 LOGIN MODIFICADO - Verificar estado de aprobación
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Verificar si el usuario está aprobado
    const userDoc = await getDoc(doc(db, 'users', email));
    
    if (!userDoc.exists()) {
      await signOut(auth);
      return {
        success: false,
        error: 'Tu cuenta aún no ha sido aprobada. Contacta al administrador.'
      };
    }

    const userData = userDoc.data();
    
    if (userData.status !== 'approved') {
      await signOut(auth);
      return {
        success: false,
        error: 'Tu cuenta está pendiente de aprobación.'
      };
    }

    return {
      success: true,
      user: {
        ...userCredential.user,
        role: userData.role,
        status: userData.status
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 🚪 LOGOUT (sin cambios)
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 👀 OBSERVER MODIFICADO - Incluir información de rol
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Obtener información adicional del usuario
      const userDoc = await getDoc(doc(db, 'users', user.email));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        callback({
          ...user,
          role: userData.role,
          status: userData.status
        });
      } else {
        // Usuario no aprobado
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};