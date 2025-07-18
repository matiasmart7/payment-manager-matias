import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

export const savePayment = async (userId, paymentData) => {
  console.log('🔥 Firebase: Guardando pago para userId:', userId);
  console.log('🔥 Firebase: Datos del pago:', paymentData);
  
  try {
    const docRef = await addDoc(collection(db, 'payments'), {
      ...paymentData,
      userId,
      createdAt: new Date().toISOString()
    });
    
    console.log('🔥 Firebase: Pago guardado con ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('🔥 Firebase: Error guardando pago:', error);
    return { success: false, error: error.message };
  }
};

export const getUserPayments = async (userId) => {
  console.log('🔥 Firebase: Iniciando getUserPayments para userId:', userId);
  
  try {
    const q = query(
      collection(db, 'payments'),
      where('userId', '==', userId)
      // Quitar orderBy temporalmente hasta crear el índice
      // orderBy('createdAt', 'desc')
    );
    
    console.log('🔥 Firebase: Query creado, ejecutando...');
    const querySnapshot = await getDocs(q);
    console.log('🔥 Firebase: Query ejecutado, docs encontrados:', querySnapshot.size);
    
    const payments = [];
    querySnapshot.forEach((doc) => {
      console.log('🔥 Firebase: Procesando doc:', doc.id, doc.data());
      payments.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar en JavaScript en lugar de Firebase
    payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log('🔥 Firebase: Total pagos procesados:', payments.length);
    console.log('🔥 Firebase: Pagos finales:', payments);
    
    return { success: true, payments };
  } catch (error) {
    console.error('🔥 Firebase: Error en getUserPayments:', error);
    return { success: false, error: error.message };
  }
};

export const updatePayment = async (paymentId, updateData) => {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, updateData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deletePayment = async (paymentId) => {
  try {
    await deleteDoc(doc(db, 'payments', paymentId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};