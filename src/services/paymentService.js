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
  try {
    const docRef = await addDoc(collection(db, 'payments'), {
      ...paymentData,
      userId,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserPayments = async (userId) => {
  try {
    const q = query(
      collection(db, 'payments'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const payments = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, payments };
  } catch (error) {
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