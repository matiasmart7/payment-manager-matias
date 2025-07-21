import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query
} from 'firebase/firestore';
import { db } from '../firebase';

// 💾 GUARDAR PAGO - Ahora en subcolección por usuario
export const savePayment = async (userId, paymentData) => {
  console.log('🔥 Firebase: Guardando pago para userId:', userId);
  console.log('🔥 Firebase: Datos del pago:', paymentData);
  
  try {
    // Guardar en payments/{userId}/userPayments/{documentId}
    const userPaymentsRef = collection(db, 'payments', userId, 'userPayments');
    const docRef = await addDoc(userPaymentsRef, {
      ...paymentData,
      createdAt: new Date().toISOString()
    });
    
    console.log('🔥 Firebase: Pago guardado con ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('🔥 Firebase: Error guardando pago:', error);
    return { success: false, error: error.message };
  }
};

// 📋 OBTENER PAGOS - Ahora desde subcolección del usuario
export const getUserPayments = async (userId) => {
  console.log('🔥 Firebase: Iniciando getUserPayments para userId:', userId);
  
  try {
    // Leer desde payments/{userId}/userPayments/
    const userPaymentsRef = collection(db, 'payments', userId, 'userPayments');
    const q = query(userPaymentsRef, orderBy('createdAt', 'desc'));
    
    console.log('🔥 Firebase: Query creado, ejecutando...');
    const querySnapshot = await getDocs(q);
    console.log('🔥 Firebase: Query ejecutado, docs encontrados:', querySnapshot.size);
    
    const payments = [];
    querySnapshot.forEach((doc) => {
      console.log('🔥 Firebase: Procesando doc:', doc.id, doc.data());
      payments.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('🔥 Firebase: Total pagos procesados:', payments.length);
    console.log('🔥 Firebase: Pagos finales:', payments);
    
    return { success: true, payments };
  } catch (error) {
    console.error('🔥 Firebase: Error en getUserPayments:', error);
    return { success: false, error: error.message };
  }
};

// ✏️ ACTUALIZAR PAGO - Ahora en subcolección del usuario
export const updatePayment = async (paymentId, updateData) => {
  try {
    // Necesitamos el userId para la ruta correcta
    // Lo obtenemos del contexto de autenticación
    const { auth } = await import('../firebase');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }
    
    // Actualizar en payments/{userId}/userPayments/{paymentId}
    const paymentRef = doc(db, 'payments', currentUser.email, 'userPayments', paymentId);
    await updateDoc(paymentRef, updateData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 🗑️ ELIMINAR PAGO - Ahora en subcolección del usuario
export const deletePayment = async (paymentId) => {
  try {
    // Necesitamos el userId para la ruta correcta
    const { auth } = await import('../firebase');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }
    
    // Eliminar desde payments/{userId}/userPayments/{paymentId}
    const paymentRef = doc(db, 'payments', currentUser.email, 'userPayments', paymentId);
    await deleteDoc(paymentRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 🔄 MIGRAR DATOS EXISTENTES (función temporal)
export const migrateUserPayments = async () => {
  try {
    const { auth } = await import('../firebase');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuario no autenticado para migración');
    }
    
    console.log('🔄 Iniciando migración para:', currentUser.email);
    
    // 1. Obtener pagos de la colección antigua
    const oldPaymentsRef = collection(db, 'payments');
    const q = query(oldPaymentsRef, where('userId', '==', currentUser.email));
    const querySnapshot = await getDocs(q);
    
    console.log('🔄 Pagos encontrados para migrar:', querySnapshot.size);
    
    // 2. Migrar cada pago a la nueva estructura
    const userPaymentsRef = collection(db, 'payments', currentUser.email, 'userPayments');
    
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      
      // Eliminar userId ya que ahora está implícito en la ruta
      const { userId, ...paymentData } = data;
      
      // Crear en nueva ubicación
      await addDoc(userPaymentsRef, paymentData);
      
      // Eliminar de ubicación antigua
      await deleteDoc(doc(db, 'payments', docSnapshot.id));
      
      console.log('🔄 Migrado pago:', docSnapshot.id);
    }
    
    console.log('✅ Migración completada');
    return { success: true, migratedCount: querySnapshot.size };
  } catch (error) {
    console.error('❌ Error en migración:', error);
    return { success: false, error: error.message };
  }
};