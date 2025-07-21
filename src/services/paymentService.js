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

// 💾 GUARDAR PAGO - Usando UID consistente
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

// 📋 OBTENER PAGOS - Usando UID consistente
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

// ✏️ ACTUALIZAR PAGO - CORREGIDO: Usar mismo userId
export const updatePayment = async (paymentId, updateData) => {
  try {
    // Obtener userId consistente (UID, no email)
    const { auth } = await import('../firebase');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }
    
    // USAR UID en lugar de email para consistencia
    const userId = currentUser.uid;
    
    // Actualizar en payments/{userId}/userPayments/{paymentId}
    const paymentRef = doc(db, 'payments', userId, 'userPayments', paymentId);
    await updateDoc(paymentRef, updateData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 🗑️ ELIMINAR PAGO - CORREGIDO: Usar mismo userId
export const deletePayment = async (paymentId) => {
  try {
    // Obtener userId consistente (UID, no email)
    const { auth } = await import('../firebase');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }
    
    // USAR UID en lugar de email para consistencia
    const userId = currentUser.uid;
    
    // Eliminar desde payments/{userId}/userPayments/{paymentId}
    const paymentRef = doc(db, 'payments', userId, 'userPayments', paymentId);
    await deleteDoc(paymentRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};