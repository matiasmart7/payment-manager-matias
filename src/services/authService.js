// 🔄 services/authService.js - MODIFICADO para sistema de aprobación

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail // ← Para resetear pass
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// 📧 REGISTRO MODIFICADO - Con datos de perfil
export const registerUser = async (email, password, profileData = {}) => {
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
      
      // Crear como admin directamente con perfil
      await setDoc(doc(db, 'users', email), {
        email: email,
        role: 'admin',
        status: 'approved',
        firstName: profileData.firstName || 'Admin',
        lastName: profileData.lastName || 'Principal',
        gender: profileData.gender || 'M',
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
    
    // Crear solicitud pendiente con datos de perfil
    await setDoc(doc(db, 'pending_registrations', email), {
      email: email,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      gender: profileData.gender,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    });

    // Cerrar sesión inmediatamente
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

// 🔐 LOGIN MODIFICADO - Verificar estado de aprobación y bloqueo
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
    
    if (userData.status === 'blocked') {
      await signOut(auth);
      return {
        success: false,
        error: 'Tu cuenta está bloqueada. Contacta al administrador.'
      };
    }
    
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
        status: userData.status,
        firstName: userData.firstName,
        lastName: userData.lastName,
        gender: userData.gender
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

// 👀 OBSERVER MODIFICADO - Incluir información de rol y perfil
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
          status: userData.status,
          firstName: userData.firstName,  // ← AGREGAR ESTO
          lastName: userData.lastName,    // ← AGREGAR ESTO
          gender: userData.gender         // ← AGREGAR ESTO
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

// 🔑 RECUPERACIÓN DE CONTRASEÑA CON VALIDACIÓN
export const resetPassword = async (email) => {
  try {
    // 1. PRIMERO: Verificar si el usuario está aprobado en nuestro sistema
    const userDoc = await getDoc(doc(db, 'users', email));
    
    if (!userDoc.exists()) {
      return {
        success: false,
        error: 'No existe una cuenta registrada con este email en nuestro sistema.'
      };
    }

    const userData = userDoc.data();
    
    if (userData.status !== 'approved') {
      return {
        success: false,
        error: 'Tu cuenta aún no ha sido aprobada. Contacta al administrador.'
      };
    }

    // 2. SOLO SI ESTÁ APROBADO: Enviar email de Firebase
    await sendPasswordResetEmail(auth, email);
    
    return {
      success: true,
      message: 'Email de recuperación enviado. Revisa tu bandeja de entrada.'
    };
  } catch (error) {
    let errorMessage = error.message;
    
    // Manejar email ya en uso
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Este email ya está registrado en el sistema. Si fue eliminado recientemente, contacta al administrador o usa un email diferente.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Formato de email inválido.';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}  