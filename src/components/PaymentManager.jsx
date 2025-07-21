import React, { useState, useEffect } from 'react';
import { onAuthStateChange, loginUser, logoutUser } from '../services/authService';
import { getUserPayments, savePayment, updatePayment, deletePayment } from '../services/paymentService';
import {
  Plus,
  Check,
  X,
  Calendar,
  DollarSign,
  CreditCard,
  Archive,
  Settings,
  Trash2,
  User,
  LogOut,
  Eye,
  EyeOff,
  Edit,
  Save,
  Download,
  Upload,
  Filter,
  Smartphone,
  Zap,
  Music,
  Building,
  AlertCircle,
  Clock
} from 'lucide-react';

const PaymentManager = () => {
  const [payments, setPayments] = useState([]);
  const [completedPayments, setCompletedPayments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCancelSubscription, setShowCancelSubscription] = useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVariablePayment, setShowVariablePayment] = useState(false);
  const [variablePaymentData, setVariablePaymentData] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    startDate: '',
    totalQuotas: '',
    paymentType: 'new',
    paidQuotas: 0,
    firstPaymentMonth: 'current',
    comments: '',
    category: 'tarjetas',
    dueDay: 1,
    isSubscription: false
  });

  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [showActivePaymentsModal, setShowActivePaymentsModal] = useState(false);
  const [showCompletedPaymentsModal, setShowCompletedPaymentsModal] = useState(false);
  const [searchActivePayments, setSearchActivePayments] = useState('');
  const [searchCompletedPayments, setSearchCompletedPayments] = useState('');
  const [showAdvancedPayment, setShowAdvancedPayment] = useState(false);
  const [advancedPaymentData, setAdvancedPaymentData] = useState(null);

  // 🏷️ CONFIGURACIÓN DE CATEGORÍAS
  const categories = {
    tarjetas: {
      name: 'Tarjetas',
      icon: CreditCard,
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    prestamos: {
      name: 'Préstamos',
      icon: Building,
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    },
    telefonia: {
      name: 'Telefonía',
      icon: Smartphone,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    servicios: {
      name: 'Servicios',
      icon: Zap,
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-200'
    },
    suscripciones: {
      name: 'Suscripciones',
      icon: Music,
      color: 'pink',
      bgColor: 'bg-pink-100',
      textColor: 'text-pink-600',
      borderColor: 'border-pink-200'
    },
    casas_comerciales: {
      name: 'Casas Comerciales',
      icon: Archive,
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200'
    }
  };

  // Función para obtener información de categoría
  const getCategoryInfo = (categoryKey) => {
    return categories[categoryKey] || categories.tarjetas;
  };

  // Función para obtener pagos filtrados por categoría
  const getFilteredPayments = (paymentsList) => {
    if (selectedCategory === 'all') {
      return paymentsList;
    }
    return paymentsList.filter(payment => payment.category === selectedCategory);
  };

  // Función para obtener estadísticas por categoría
  const getCategoryStats = () => {
    const stats = {};
    
    Object.keys(categories).forEach(categoryKey => {
      const categoryPayments = payments.filter(p => p.category === categoryKey);
      const categoryCompleted = completedPayments.filter(p => p.category === categoryKey);
      
      const totalPending = categoryPayments.reduce((total, payment) => {
        if (payment.isSubscription) {
          return total + payment.amount;
        } else {
          const remainingQuotas = payment.totalQuotas - payment.paidQuotas;
          return total + (payment.amount * remainingQuotas);
        }
      }, 0);

      stats[categoryKey] = {
        active: categoryPayments.length,
        completed: categoryCompleted.length,
        totalPending: totalPending,
        info: categories[categoryKey]
      };
    });

    return stats;
  };

  // 📅 Función para obtener próximos vencimientos
  const getUpcomingDueDates = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return payments
      .filter(payment => payment.dueDay)
      .map(payment => {
        let daysUntilDue;
        
        // Para suscripciones, telefonía Y TARJETAS, verificar si ya pagó este mes
        if (payment.isSubscription || payment.category === 'tarjetas') {
          const alreadyPaidThisMonth = payment.paymentHistory?.some(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
          });
          
          // Si ya pagó este mes, no mostrar en próximos vencimientos
          if (alreadyPaidThisMonth) {
            return null;
          }
        }
        
        // Para cuotas tradicionales (préstamos, casas comerciales, servicios)
        if (!payment.isSubscription && payment.category !== 'tarjetas') {
          // Si está completado, no mostrar
          if (payment.paidQuotas >= payment.totalQuotas) {
            return null;
          }
          
          // Si ya pagó la cuota de este mes, no mostrar
          if (payment.currentMonthPaid) {
            return null;
          }
        }
        
        // Si el día de vencimiento ya pasó este mes, calcular para el próximo mes
        if (payment.dueDay < currentDay) {
          const nextMonthDue = new Date(currentYear, currentMonth + 1, payment.dueDay);
          const diffTime = nextMonthDue - today;
          daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
          // Si el día de vencimiento es hoy o futuro este mes
          daysUntilDue = payment.dueDay - currentDay;
        }
        
        return {
          ...payment,
          daysUntilDue
        };
      })
      .filter(payment => payment !== null && payment.daysUntilDue <= 7) // Mostrar solo los próximos 7 días
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 5);
  };

  // 🔄 FUNCIONES DE PERSISTENCIA LOCAL 
  const saveToLocalStorage = (paymentsData, completedData, authStatus) => {
    try {
      const dataToSave = {
        payments: paymentsData,
        completedPayments: completedData,
        isAuthenticated: authStatus,
        selectedCategory: selectedCategory,
        lastSaved: new Date().toISOString(),
        version: '3.0'
      };
      localStorage.setItem('paymentManagerData', JSON.stringify(dataToSave));
      console.log('✅ Datos guardados correctamente');
    } catch (error) {
      console.error('❌ Error al guardar datos:', error);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const savedData = localStorage.getItem('paymentManagerData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        const migratePayments = (payments) => {
          return payments.map(payment => ({
            ...payment,
            category: payment.category || 'tarjetas',
            dueDay: payment.dueDay || 1,
            isSubscription: payment.category === 'suscripciones' || payment.category === 'telefonia' ? true : (payment.isSubscription || false),
            paymentHistory: payment.paymentHistory || []
          }));
        };

        setPayments(migratePayments(parsedData.payments || []));
        setCompletedPayments(migratePayments(parsedData.completedPayments || []));
        setIsAuthenticated(parsedData.isAuthenticated || false);
        setSelectedCategory(parsedData.selectedCategory || 'all');
        
        console.log('✅ Datos cargados correctamente');
        console.log('📅 Última vez guardado:', parsedData.lastSaved);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      return false;
    }
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('paymentManagerData');
    console.log('🗑️ Datos locales eliminados');
  };

  const exportData = () => {
    try {
      const dataToExport = {
        payments,
        completedPayments,
        categories: categories,
        exportDate: new Date().toISOString(),
        version: '3.0'
      };
      
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pagos-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      console.log('📦 Datos exportados correctamente');
    } catch (error) {
      console.error('❌ Error al exportar:', error);
      alert('Error al exportar los datos');
    }
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        if (importedData.payments && importedData.completedPayments) {
          const migratePayments = (payments) => {
            return payments.map(payment => ({
              ...payment,
              category: payment.category || 'tarjetas',
              dueDay: payment.dueDay || 1,
              isSubscription: payment.category === 'suscripciones' || payment.category === 'telefonia' ? true : (payment.isSubscription || false),
              paymentHistory: payment.paymentHistory || []
            }));
          };

          setPayments(migratePayments(importedData.payments));
          setCompletedPayments(migratePayments(importedData.completedPayments));
          alert('✅ Datos importados correctamente');
          console.log('📥 Datos importados desde:', importedData.exportDate);
        } else {
          alert('❌ Archivo no válido');
        }
      } catch (error) {
        console.error('❌ Error al importar:', error);
        alert('❌ Error al leer el archivo');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Actualizar formData cuando cambie la categoría
  useEffect(() => {
    if (formData.category === 'suscripciones' || formData.category === 'telefonia' || formData.category === 'tarjetas') {
      setFormData(prev => ({
        ...prev,
        isSubscription: true,
        totalQuotas: '',
        paymentType: 'new'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        isSubscription: false
      }));
    }
  }, [formData.category]);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        loadUserData(user.uid);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setPayments([]);
        setCompletedPayments([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);  
  // Función para formatear números con puntos como separadores de miles
  const formatCurrency = (amount) => {
    return parseInt(amount).toLocaleString('es-PY').replace(/,/g, '.');
  };

  // Función para parsear el input del usuario
  const parseAmount = (value) => {
    return value.replace(/\./g, '').replace(/[^0-9]/g, '');
  };

  // Función para obtener el nombre del mes
  const getMonthName = (monthIndex) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  };

  // Función para calcular el próximo mes de pago
  const calculateNextPaymentMonth = (startDate, paidQuotas, firstPaymentMonth) => {
    const start = new Date(startDate);
    let baseDate;

    if (firstPaymentMonth === 'next') {
      baseDate = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    } else {
      baseDate = new Date(start.getFullYear(), start.getMonth(), 1);
    }

    return new Date(baseDate.getFullYear(), baseDate.getMonth() + paidQuotas, 1);
  };

  // Generar automáticamente el próximo pago al final del mes
  const generateNextPayment = () => {
    const today = new Date();
    const isLastDayOfMonth = today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    if (isLastDayOfMonth) {
      setPayments(prevPayments =>
        prevPayments.map(payment => {
          const nextPaymentDate = calculateNextPaymentMonth(
            payment.startDate,
            payment.paidQuotas,
            payment.firstPaymentMonth
          );

          if (
            nextPaymentDate.getMonth() === today.getMonth() + 1 &&
            nextPaymentDate.getFullYear() === today.getFullYear()
          ) {
            return {
              ...payment,
              nextPaymentMonth: getMonthName(nextPaymentDate.getMonth())
            };
          }
          return payment;
        })
      );
    }
  };

  useEffect(() => {
    generateNextPayment();
    const interval = setInterval(generateNextPayment, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Función de login
  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      alert('Por favor completa todos los campos');
      return;
    }

    const result = await loginUser(loginData.username, loginData.password);
    
    if (result.success) {
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      setLoginData({ username: '', password: '' });
      // Cargar datos del usuario
      loadUserData(result.user.uid);
    } else {
      alert('Error: ' + result.error);
    }
  };

  // Agregar esta función junto a handleLogin
  const handleRegister = async () => {
    if (!loginData.username || !loginData.password) {
      alert('Por favor completa todos los campos');
      return;
    }

    const { registerUser } = await import('../services/authService');
    const result = await registerUser(loginData.username, loginData.password);
    
    if (result.success) {
      alert('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.');
      setLoginData({ username: '', password: '' });
    } else {
      alert('Error al crear cuenta: ' + result.error);
    }
  };

  // Nueva función para cargar datos del usuario
  const loadUserData = async (userId) => {
    console.log('🔍 Cargando datos para usuario:', userId);
    
    try {
      const result = await getUserPayments(userId);
      console.log('📊 Resultado de getUserPayments:', result);
      
      if (result.success) {
        const userPayments = result.payments;
        console.log('📝 Total pagos encontrados:', userPayments.length);
        console.log('📋 Pagos completos:', userPayments);
        
        const activePayments = userPayments.filter(p => !p.completedAt);
        const completedPayments = userPayments.filter(p => p.completedAt);
        
        console.log('✅ Pagos activos:', activePayments.length);
        console.log('✅ Pagos completados:', completedPayments.length);
        
        setPayments(activePayments);
        setCompletedPayments(completedPayments);
      } else {
        console.error('❌ Error cargando datos:', result.error);
      }
    } catch (error) {
      console.error('❌ Error en loadUserData:', error);
    }
  };

  // Función de logout
  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setPayments([]);
      setCompletedPayments([]);
      setShowSettingsMenu(false);
    }
  };

  // Confirmar eliminación
  const confirmDelete = (id, type) => {
    setItemToDelete(id);
    setDeleteType(type);
    setShowDeleteConfirm(true);
    setShowSettingsMenu(false);
  };

  // Eliminar pago
  const handleDelete = async () => {
    // 🔥 ELIMINAR EN FIREBASE
    const result = await deletePayment(itemToDelete);
    
    if (result.success) {
      // Recargar datos desde Firebase
      await loadUserData(currentUser.uid);
    } else {
      alert('Error al eliminar: ' + result.error);
    }

    setShowDeleteConfirm(false);
    setItemToDelete(null);
    setDeleteType('');
  };

  // 🎵 Cancelar suscripción
  const cancelSubscription = (id) => {
    setSubscriptionToCancel(id);
    setShowCancelSubscription(true);
  };

  const confirmCancelSubscription = async () => {
    const subscription = payments.find(p => p.id === subscriptionToCancel);
    if (subscription) {
      // 🔥 MARCAR COMO CANCELADA EN FIREBASE
      const result = await updatePayment(subscription.id, {
        completedAt: new Date().toISOString(),
        cancelledAt: new Date().toISOString()
      });

      if (result.success) {
        // Recargar datos desde Firebase
        await loadUserData(currentUser.uid);
      } else {
        alert('Error al cancelar: ' + result.error);
      }
    }
    
    setShowCancelSubscription(false);
    setSubscriptionToCancel(null);
  };

  // Agregar nuevo pago
  const handleSubmit = async () => {
    if (!formData.name || !formData.amount || !formData.startDate) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    if (!formData.isSubscription && !formData.totalQuotas) {
      alert('Por favor ingresa el total de cuotas');
      return;
    }

    const newPayment = {
      name: formData.name,
      amount: parseInt(formData.amount),
      startDate: formData.startDate,
      totalQuotas: formData.isSubscription ? null : parseInt(formData.totalQuotas),
      paidQuotas: formData.paymentType === 'existing' ? parseInt(formData.paidQuotas) : 0,
      firstPaymentMonth: formData.firstPaymentMonth,
      comments: formData.comments || '',
      category: formData.category,
      dueDay: parseInt(formData.dueDay),
      isSubscription: formData.isSubscription,
      currentMonthPaid: false,
      paymentHistory: []
    };

    if (!formData.isSubscription) {
      const nextPaymentDate = calculateNextPaymentMonth(
        newPayment.startDate,
        newPayment.paidQuotas,
        newPayment.firstPaymentMonth
      );
      newPayment.nextPaymentMonth = getMonthName(nextPaymentDate.getMonth());

      if (newPayment.paidQuotas >= newPayment.totalQuotas) {
        newPayment.completedAt = new Date().toISOString();
      }
    }

    // 🔥 GUARDAR EN FIREBASE
    const result = await savePayment(currentUser.uid, newPayment);
    
    if (result.success) {
      // Recargar datos desde Firebase
      await loadUserData(currentUser.uid);
      
      // Limpiar formulario
      setFormData({
        name: '',
        amount: '',
        startDate: '',
        totalQuotas: '',
        paymentType: 'new',
        paidQuotas: 0,
        firstPaymentMonth: 'current',
        comments: '',
        category: 'tarjetas',
        dueDay: 1,
        isSubscription: false
      });
      setShowForm(false);
    } else {
      alert('Error al guardar: ' + result.error);
      console.error('Error:', result.error);
    }
  };

  // Marcar como pagado
  const markAsPaid = (id) => {
    const payment = payments.find(p => p.id === id);
    if (!payment) return;

    // Si es tarjeta de crédito, verificar si ya pagó este mes
    if (payment.category === 'tarjetas') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const alreadyPaidThisMonth = payment.paymentHistory?.some(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      });

      if (alreadyPaidThisMonth) {
        // Mostrar modal para pago adicional en tarjetas
        setAdvancedPaymentData({ payment, type: 'additionalPayment' });
        setShowAdvancedPayment(true);
        return;
      }

      // Si no ha pagado este mes, ir directo al modal de pago variable
      setVariablePaymentData(payment);
      setCustomAmount(payment.amount.toString());
      setShowVariablePayment(true);
      return;
    }

    // Si es suscripción o telefonía, verificar si ya pagó este mes
    if (payment.isSubscription) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const alreadyPaidThisMonth = payment.paymentHistory?.some(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      });

      if (alreadyPaidThisMonth) {
        // Mostrar modal para pago anticipado
        setAdvancedPaymentData({ payment, type: 'nextMonth' });
        setShowAdvancedPayment(true);
        return;
      }
    }

    setPaymentToConfirm(id);
    setShowConfirmPayment(true);
  };

  // Confirmar pago
  const confirmPayment = async () => {
    const paymentIndex = payments.findIndex(p => p.id === paymentToConfirm);
    if (paymentIndex === -1) return;

    const payment = payments[paymentIndex];

    if (payment.isSubscription) {
      const currentDate = new Date();
      const paymentRecord = {
        date: currentDate.toISOString(),
        amount: payment.amount,
        month: currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      };

      const updatedPayment = {
        ...payment,
        currentMonthPaid: true,
        lastPaidAt: currentDate.toISOString(),
        paymentHistory: [...(payment.paymentHistory || []), paymentRecord]
      };
      
      // 🔥 ACTUALIZAR EN FIREBASE
      const result = await updatePayment(payment.id, {
        currentMonthPaid: true,
        lastPaidAt: updatedPayment.lastPaidAt,
        paymentHistory: updatedPayment.paymentHistory
      });

      if (result.success) {
        // Recargar datos desde Firebase
        await loadUserData(currentUser.uid);
      } else {
        alert('Error al actualizar: ' + result.error);
      }
    } else {
      const updatedPayment = {
        ...payment,
        paidQuotas: payment.paidQuotas + 1,
        currentMonthPaid: true
      };

      const isCompleted = updatedPayment.paidQuotas >= updatedPayment.totalQuotas;

      if (isCompleted) {
        // 🔥 MARCAR COMO COMPLETADO EN FIREBASE
        const result = await updatePayment(payment.id, {
          paidQuotas: updatedPayment.paidQuotas,
          currentMonthPaid: true,
          completedAt: new Date().toISOString()
        });

        if (result.success) {
          await loadUserData(currentUser.uid);
        } else {
          alert('Error al completar: ' + result.error);
        }
      } else {
        const nextPaymentDate = calculateNextPaymentMonth(
          updatedPayment.startDate,
          updatedPayment.paidQuotas,
          updatedPayment.firstPaymentMonth
        );
        const nextPaymentMonth = getMonthName(nextPaymentDate.getMonth());
        
        // 🔥 ACTUALIZAR EN FIREBASE
        const result = await updatePayment(payment.id, {
          paidQuotas: updatedPayment.paidQuotas,
          currentMonthPaid: true,
          nextPaymentMonth: nextPaymentMonth
        });

        if (result.success) {
          await loadUserData(currentUser.uid);
        } else {
          alert('Error al actualizar: ' + result.error);
        }
      }
    }

    setShowConfirmPayment(false);
    setPaymentToConfirm(null);
  };

  // Confirmar pago anticipado
  const confirmAdvancedPayment = async () => {
    const { payment } = advancedPaymentData;
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const paymentRecord = {
      date: nextMonth.toISOString(),
      amount: payment.amount,
      month: nextMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    };

    const updatedPaymentHistory = [...(payment.paymentHistory || []), paymentRecord];
    
    // 🔥 ACTUALIZAR EN FIREBASE
    const result = await updatePayment(payment.id, {
      paymentHistory: updatedPaymentHistory
    });

    if (result.success) {
      // Recargar datos desde Firebase
      await loadUserData(currentUser.uid);
    } else {
      alert('Error al actualizar: ' + result.error);
    }

    setShowAdvancedPayment(false);
    setAdvancedPaymentData(null);
  };

  // Confirmar pago variable para tarjetas
  const confirmVariablePayment = async () => {
    const payment = variablePaymentData;
    const paidAmount = parseInt(customAmount);
    
    if (!paidAmount || paidAmount < payment.amount) {
      alert(`El monto debe ser mayor o igual al pago mínimo de ₲${formatCurrency(payment.amount)}`);
      return;
    }

    const currentDate = new Date();
    const paymentRecord = {
      date: currentDate.toISOString(),
      amount: paidAmount,
      minimumAmount: payment.amount,
      month: currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      type: paidAmount === payment.amount ? 'minimum' : 'above_minimum'
    };

    const updatedPayment = {
      ...payment,
      lastPaidAt: currentDate.toISOString(),
      paymentHistory: [...(payment.paymentHistory || []), paymentRecord]
    };

    // Actualizar en Firebase
    const result = await updatePayment(payment.id, {
      lastPaidAt: updatedPayment.lastPaidAt,
      paymentHistory: updatedPayment.paymentHistory
    });

    if (result.success) {
      // Recargar datos
      await loadUserData(currentUser.uid);
    } else {
      alert('Error al actualizar: ' + result.error);
    }

    setShowVariablePayment(false);
    setVariablePaymentData(null);
    setCustomAmount('');
  };

  // Obtener monto pendiente total
  const getTotalPending = () => {
    const filteredPayments = getFilteredPayments(payments);
    return filteredPayments.reduce((total, payment) => {
      if (payment.isSubscription) {
        return total + payment.amount;
      } else {
        const remainingQuotas = payment.totalQuotas - payment.paidQuotas;
        return total + (payment.amount * remainingQuotas);
      }
    }, 0);
  };

  // Total por pago
  const getTotalPaymentAmount = (payment) => {
    if (payment.isSubscription) {
      return payment.amount;
    }
    return payment.amount * payment.totalQuotas;
  };

  // Abrir modal de edición
  const openEditModal = (payment) => {
    setEditFormData({ 
      ...payment,
      category: payment.category || 'tarjetas',
      dueDay: payment.dueDay || 1,
      isSubscription: payment.isSubscription || false
    });
    setShowEditForm(true);
  };

  // Guardar cambios de edición
  const handleSaveEdit = async () => {
    if (!editFormData.name || !editFormData.amount || !editFormData.startDate) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    if (!editFormData.isSubscription && !editFormData.totalQuotas) {
      alert('Por favor ingresa el total de cuotas');
      return;
    }

    // 🔥 ACTUALIZAR EN FIREBASE
    const dataToUpdate = {
      name: editFormData.name,
      amount: parseInt(editFormData.amount),
      startDate: editFormData.startDate,
      category: editFormData.category,
      dueDay: editFormData.dueDay,
      comments: editFormData.comments || '',
      isSubscription: editFormData.isSubscription
    };

    // Agregar campos específicos para cuotas
    if (!editFormData.isSubscription) {
      dataToUpdate.totalQuotas = editFormData.totalQuotas;
      dataToUpdate.firstPaymentMonth = editFormData.firstPaymentMonth;
    }

    const result = await updatePayment(editFormData.id, dataToUpdate);
    
    if (result.success) {
      // Recargar datos desde Firebase
      await loadUserData(currentUser.uid);
    } else {
      alert('Error al actualizar: ' + result.error);
    }

    setShowEditForm(false);
    setEditFormData(null);
  };

  // Pantalla de login
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  } 
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <User className="text-blue-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Iniciar Sesión</h2>
            <p className="text-gray-600">Accede al gestor de pagos</p>
            
            {(() => {
              const savedData = localStorage.getItem('paymentManagerData');
              if (savedData) {
                const parsed = JSON.parse(savedData);
                const totalSaved = (parsed.payments?.length || 0) + (parsed.completedPayments?.length || 0);
                if (totalSaved > 0) {
                  return (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        💾 <strong>{totalSaved}</strong> pagos guardados localmente
                      </p>
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingrese su usuario"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="Ingrese su contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={handleRegister}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors mt-2"
            >
              Crear Cuenta
            </button>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Credenciales de prueba:</strong><br/>
                Usuario: Ingresa Correo<br/>
                Contraseña: Contraseña Creada
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Obtener pagos filtrados para mostrar
  const filteredPayments = getFilteredPayments(payments);
  const filteredCompletedPayments = getFilteredPayments(completedPayments);
  const upcomingDueDates = getUpcomingDueDates();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Gestor de Pagos Mensuales</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={18} /> Nuevo Pago
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Settings size={18} /> Ajustes
              </button>

              {/* Menú de ajustes mejorado */}
              {showSettingsMenu && (
                <div className="absolute bg-white rounded shadow-lg z-50 w-80 mt-2 right-0">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-700">Configuraciones</h3>
                  </div>
                  
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-600 mb-3">💾 Backup y Restauración</h4>
                    <div className="space-y-2">
                      <button
                        onClick={exportData}
                        className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2 rounded"
                      >
                        <Download size={16} /> Exportar Datos (JSON)
                      </button>
                      <label className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 rounded cursor-pointer">
                        <Upload size={16} /> Importar Datos
                        <input
                          type="file"
                          accept=".json"
                          onChange={importData}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* 📋 Gestión de Pagos */}
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-600 mb-3">📋 Gestión de Pagos</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setShowActivePaymentsModal(true);
                          setShowSettingsMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center justify-between rounded"
                      >
                        <span>📋 Pagos Activos</span>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          {payments.length}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setShowCompletedPaymentsModal(true);
                          setShowSettingsMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center justify-between rounded"
                      >
                        <span>✅ Pagos Completados</span>
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                          {completedPayments.length}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 🚪 Cerrar Sesión */}
                  <div className="p-4">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 rounded"
                    >
                      <LogOut size={16} /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Modal de Pagos Activos */}
        {showActivePaymentsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">📋 Pagos Activos ({payments.length})</h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={searchActivePayments}
                      onChange={(e) => setSearchActivePayments(e.target.value)}
                      className="pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Settings className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                  </div>
                  <button
                    onClick={() => setShowActivePaymentsModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-2">
                  {payments.filter(payment => 
                    payment.name.toLowerCase().includes(searchActivePayments.toLowerCase())
                  ).length > 0 ? (
                    payments.filter(payment => 
                      payment.name.toLowerCase().includes(searchActivePayments.toLowerCase())
                    ).map((payment) => {
                      const categoryInfo = getCategoryInfo(payment.category);
                      const CategoryIcon = categoryInfo.icon;
                      return (
                        <div key={payment.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`${categoryInfo.bgColor} p-2 rounded-full`}>
                              <CategoryIcon className={categoryInfo.textColor} size={18} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-gray-800">{payment.name}</h3>
                                {payment.isSubscription && (
                                  <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">SUB</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {categoryInfo.name} • ₲{formatCurrency(payment.amount)}/mes
                                {payment.dueDay && ` • Vence día ${payment.dueDay}`}
                              </p>
                              {!payment.isSubscription && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {payment.paidQuotas}/{payment.totalQuotas} cuotas pagadas
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                openEditModal(payment);
                                setShowActivePaymentsModal(false);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50"
                              title="Editar pago"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => {
                                confirmDelete(payment.id, 'active');
                                setShowActivePaymentsModal(false);
                              }}
                              className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
                              title="Eliminar pago"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {searchActivePayments 
                          ? `No se encontraron pagos con "${searchActivePayments}"`
                          : "No hay pagos activos"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pagos Completados */}
        {showCompletedPaymentsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">✅ Pagos Completados ({completedPayments.length})</h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={searchCompletedPayments}
                      onChange={(e) => setSearchCompletedPayments(e.target.value)}
                      className="pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Settings className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                  </div>
                  <button
                    onClick={() => setShowCompletedPaymentsModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-2">
                  {completedPayments.filter(payment => 
                    payment.name.toLowerCase().includes(searchCompletedPayments.toLowerCase())
                  ).length > 0 ? (
                    completedPayments.filter(payment => 
                      payment.name.toLowerCase().includes(searchCompletedPayments.toLowerCase())
                    ).map((payment) => {
                      const categoryInfo = getCategoryInfo(payment.category);
                      const CategoryIcon = categoryInfo.icon;
                      return (
                        <div key={payment.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg border border-green-200 bg-green-50">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`${categoryInfo.bgColor} p-2 rounded-full`}>
                              <CategoryIcon className={categoryInfo.textColor} size={18} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-gray-800">{payment.name}</h3>
                                {payment.cancelledAt && (
                                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">CANCELADO</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {categoryInfo.name} • ₲{formatCurrency(payment.amount)}/mes
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {payment.cancelledAt ? 'Cancelado' : 'Completado'}: {new Date(payment.completedAt).toLocaleDateString()}
                                {!payment.isSubscription && ` • Total: ₲${formatCurrency(getTotalPaymentAmount(payment))}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                confirmDelete(payment.id, 'completed');
                                setShowCompletedPaymentsModal(false);
                              }}
                              className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
                              title="Eliminar pago"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <Archive size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {searchCompletedPayments 
                          ? `No se encontraron pagos con "${searchCompletedPayments}"`
                          : "No hay pagos completados"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Indicador de estado de guardado */}
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Save size={16} className="text-green-600" />
            <span>Datos guardados automáticamente</span>
          </div>
          {(() => {
            const savedData = localStorage.getItem('paymentManagerData');
            if (savedData) {
              const parsed = JSON.parse(savedData);
              const lastSaved = new Date(parsed.lastSaved);
              return (
                <span className="text-xs text-gray-500">
                  Última actualización: {lastSaved.toLocaleString()}
                </span>
              );
            }
            return null;
          })()}
        </div>

        {/* 📅 Próximos Vencimientos */}
        {upcomingDueDates.length > 0 && (
          <div className="mb-6 bg-white p-4 rounded-xl shadow-lg border-l-4 border-orange-500">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-orange-600" />
              <h3 className="font-semibold text-gray-700">
                Próximos Vencimientos (próximos 7 días)
              </h3>
            </div>
            <div className="grid gap-2">
              {upcomingDueDates.map(payment => {
                const categoryInfo = getCategoryInfo(payment.category);
                const CategoryIcon = categoryInfo.icon;
                const isUrgent = payment.daysUntilDue <= 3;
                const isToday = payment.daysUntilDue === 0;
                
                return (
                  <div key={payment.id} className={`flex items-center justify-between p-3 rounded-lg ${
                    isToday ? 'bg-red-100 border-2 border-red-300' : 
                    isUrgent ? 'bg-orange-50 border border-orange-200' : 
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <CategoryIcon className={categoryInfo.textColor} size={18} />
                      <div>
                        <span className="font-medium text-gray-800">{payment.name}</span>
                        <div className="text-sm text-gray-600">
                          {categoryInfo.name} • ₲{formatCurrency(payment.amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Vence el día {payment.dueDay} de cada mes
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                        isToday ? 'bg-red-200 text-red-800' : 
                        isUrgent ? 'bg-orange-200 text-orange-800' : 
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {isToday ? '¡HOY!' : payment.daysUntilDue === 1 ? 'Mañana' : `${payment.daysUntilDue} días`}
                      </span>
                      {isUrgent && <Clock size={16} className={isToday ? 'text-red-600' : 'text-orange-600'} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 🏷️ Filtros por Categoría */}
        <div className="mb-6 bg-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="font-semibold text-gray-700">Filtrar por Categoría</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas ({payments.length})
            </button>
            {Object.entries(categories).map(([key, category]) => {
              const CategoryIcon = category.icon;
              const categoryPayments = payments.filter(p => p.category === key);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    selectedCategory === key
                      ? `bg-${category.color}-600 text-white`
                      : `${category.bgColor} ${category.textColor} hover:bg-${category.color}-200`
                  }`}
                >
                  <CategoryIcon size={16} />
                  {category.name} ({categoryPayments.length})
                </button>
              );
            })}
          </div>
        </div>

        {/* 📊 Estadísticas por Categoría */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Object.entries(getCategoryStats()).map(([categoryKey, stats]) => {
            const CategoryIcon = stats.info.icon;
            return (
              <div key={categoryKey} className={`bg-white p-4 rounded-xl shadow-lg border-l-4 ${stats.info.borderColor}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`${stats.info.bgColor} p-2 rounded-full`}>
                    <CategoryIcon className={stats.info.textColor} size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-700 text-sm">{stats.info.name}</h3>
                    <p className="text-xs text-gray-500">
                      {stats.active} activos • {stats.completed} completados
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-800">₲{formatCurrency(stats.totalPending)}</p>
              </div>
            );
          })}
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 p-3 rounded-full">
                <DollarSign className="text-yellow-600" size={24} />
              </div>
              <h2 className="text-lg font-semibold text-gray-700">
                Total Pendiente {selectedCategory !== 'all' && `(${categories[selectedCategory]?.name})`}
              </h2>
            </div>
            <p className="text-2xl font-bold text-gray-800">₲{formatCurrency(getTotalPending())}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-3 rounded-full">
                <CreditCard className="text-blue-600" size={24} />
              </div>
              <h2 className="text-lg font-semibold text-gray-700">
                Pagos Activos {selectedCategory !== 'all' && `(${categories[selectedCategory]?.name})`}
              </h2>
            </div>
            <p className="text-2xl font-bold text-gray-800">{filteredPayments.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mb-6">
          <ul className="flex border-b border-gray-300">
            <li>
              <button
                onClick={() => setActiveTab('active')}
                className={`py-2 px-4 font-medium ${activeTab === 'active' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
              >
                Pagos Activos ({filteredPayments.length})
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-2 px-4 font-medium ${activeTab === 'completed' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}
              >
                Pagos Completados ({filteredCompletedPayments.length})
              </button>
            </li>
          </ul>
        </nav>

        {/* Pagos Activos */}
        {activeTab === 'active' && (
          <div className="p-6">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">
                  {selectedCategory === 'all' 
                    ? 'No tienes pagos activos' 
                    : `No tienes pagos activos en ${categories[selectedCategory]?.name}`
                  }
                </p>
                <p className="text-sm text-gray-400 mt-2">Haz clic en "Nuevo Pago" para agregar uno</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredPayments.map((payment) => {
                  const categoryInfo = getCategoryInfo(payment.category);
                  const CategoryIcon = categoryInfo.icon;
                  
                  return (
                    <div key={payment.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${categoryInfo.borderColor} bg-white`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`${categoryInfo.bgColor} p-1.5 rounded-full`}>
                              <CategoryIcon className={categoryInfo.textColor} size={14} />
                            </div>
                            <span className={`text-xs font-medium ${categoryInfo.textColor}`}>
                              {categoryInfo.name}
                            </span>
                            {payment.isSubscription && (
                              <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
                                Suscripción
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg text-gray-800">{payment.name}</h3>
                          <p className="text-xl font-bold text-blue-600">₲{formatCurrency(payment.amount)}/mes</p>
                          
                          {payment.dueDay && (
                            <p className="text-sm text-gray-600 mt-1">
                              📅 Vence el día {payment.dueDay} de cada mes
                            </p>
                          )}
                        </div>
                      </div>

                      {!payment.isSubscription && (
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Total: {payment.totalQuotas}</span>
                            <span>Pagado: {payment.paidQuotas}</span>
                            <span>Faltan: {payment.totalQuotas - payment.paidQuotas}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className={`bg-${categoryInfo.color}-600 h-2 rounded-full`}
                              style={{ width: `${(payment.paidQuotas / payment.totalQuotas) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 block text-center">
                            {Math.round((payment.paidQuotas / payment.totalQuotas) * 100)}% completado
                          </span>
                        </div>
                      )}

                      {payment.isSubscription && (
                        <div className="mt-4">
                          <div className="text-sm text-gray-600 mb-2">
                            {payment.lastPaidAt ? (
                              <span>Último pago: {new Date(payment.lastPaidAt).toLocaleDateString()}</span>
                            ) : (
                              <span>Sin pagos registrados</span>
                            )}
                          </div>
                          
                          {/* Verificar si ya pagó este mes */}
                          {(() => {
                            const currentMonth = new Date().getMonth();
                            const currentYear = new Date().getFullYear();
                            const paidThisMonth = payment.paymentHistory?.some(record => {
                              const recordDate = new Date(record.date);
                              return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
                            });
                            
                            return paidThisMonth && (
                              <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded mb-2">
                                ✅ Ya pagado este mes
                              </div>
                            );
                          })()}
                          
                          {/* Historial de pagos */}
                          {payment.paymentHistory && payment.paymentHistory.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-xs font-medium text-gray-600 mb-2">
                                📋 {payment.category === 'tarjetas' ? 'Historial de Pagos' : 'Historial de Pagos'}:
                              </h4>
                              <div className="max-h-20 overflow-y-auto">
                                {payment.paymentHistory.slice(-3).map((record, index) => (
                                  <div key={index} className="text-xs text-gray-500 bg-gray-50 p-1 rounded mb-1">
                                    {payment.category === 'tarjetas' ? (
                                      <>
                                        • {record.month}: ₲{formatCurrency(record.amount)}
                                        {record.type === 'above_minimum' && (
                                          <span className="text-green-600 ml-1">💪 Sobre mínimo</span>
                                        )}
                                        {record.minimumAmount && (
                                          <span className="text-gray-400 text-xs block">
                                            (Mínimo: ₲{formatCurrency(record.minimumAmount)})
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <>• {record.month}: ₲{formatCurrency(record.amount)}</>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {payment.paymentHistory.length > 3 && (
                                <div className="text-xs text-gray-400 mt-1">
                                  +{payment.paymentHistory.length - 3} pagos más...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {!payment.isSubscription && (
                        <div className="mt-4">
                          <div className="text-sm text-gray-600">Próximo: {payment.nextPaymentMonth}</div>
                        </div>
                      )}

                      {payment.comments && (
                        <div className="mt-3 text-sm text-gray-500 italic">
                          📝 {payment.comments}
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => markAsPaid(payment.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <Check size={16} /> Marcar Pagado
                        </button>
                        
                        {payment.isSubscription && (
                          <button
                            onClick={() => cancelSubscription(payment.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                            title="Cancelar suscripción"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pagos Completados */}
        {activeTab === 'completed' && (
          <div className="p-6">
            {filteredCompletedPayments.length === 0 ? (
              <div className="text-center py-12">
                <Archive size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">
                  {selectedCategory === 'all' 
                    ? 'No tienes pagos completados' 
                    : `No tienes pagos completados en ${categories[selectedCategory]?.name}`
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredCompletedPayments.map((payment) => {
                  const categoryInfo = getCategoryInfo(payment.category);
                  const CategoryIcon = categoryInfo.icon;
                  
                  return (
                    <div key={payment.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`${categoryInfo.bgColor} p-1.5 rounded-full`}>
                          <CategoryIcon className={categoryInfo.textColor} size={14} />
                        </div>
                        <span className={`text-xs font-medium ${categoryInfo.textColor}`}>
                          {categoryInfo.name}
                        </span>
                        {payment.cancelledAt && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            Cancelado
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg text-gray-800">{payment.name}</h3>
                      <p className="text-xl font-bold text-green-600">₲{formatCurrency(payment.amount)}/mes</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>
                          {payment.cancelledAt ? 'Cancelado' : 'Completado'}: {new Date(payment.completedAt).toLocaleDateString()}
                        </span>
                        {!payment.isSubscription && (
                          <span>Total pagado: ₲{formatCurrency(getTotalPaymentAmount(payment))}</span>
                        )}
                      </div>
                      {payment.comments && (
                        <div className="mt-2 text-sm text-gray-500 italic">
                          📝 {payment.comments}
                        </div>
                      )}
                      <div className="mt-2">
                        <div className="bg-green-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full w-full"></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block text-center">
                          {payment.cancelledAt ? '❌ Cancelado' : '✓ Completado'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modales */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">¿Estás seguro que deseas eliminar este pago?</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  NO
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  SÍ
                </button>
              </div>
            </div>
          </div>
        )}

        {showCancelSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">¿Cancelar suscripción?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Esta acción moverá la suscripción a "Completados" marcándola como cancelada.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelSubscription(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  NO
                </button>
                <button
                  onClick={confirmCancelSubscription}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  SÍ, CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}

        {showAdvancedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                ✅ Pago ya registrado este mes
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Ya registraste el pago de <strong>{advancedPaymentData?.payment.name}</strong> este mes.
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  {advancedPaymentData?.type === 'additionalPayment' 
                    ? '¿Deseas registrar otro pago más para la tarjeta este mes?'
                    : '¿Deseas registrar un pago anticipado para el próximo mes?'
                  }
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdvancedPayment(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  NO
                </button>
                <button
                  onClick={() => {
                    if (advancedPaymentData?.type === 'additionalPayment') {
                      // Para tarjetas, ir al modal de pago variable
                      setVariablePaymentData(advancedPaymentData.payment);
                      setCustomAmount(advancedPaymentData.payment.amount.toString());
                      setShowVariablePayment(true);
                      setShowAdvancedPayment(false);
                    } else {
                      // Para suscripciones, pago anticipado
                      confirmAdvancedPayment();
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {advancedPaymentData?.type === 'additionalPayment' ? 'SÍ, PAGAR' : 'SÍ, PAGO ANTICIPADO'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showVariablePayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                💳 Pagar Tarjeta de Crédito
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>{variablePaymentData?.name}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Pago mínimo: <strong>₲{formatCurrency(variablePaymentData?.amount || 0)}</strong>
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto a pagar:
                </label>
                <input
                  type="text"
                  value={formatCurrency(customAmount)}
                  onChange={(e) => setCustomAmount(parseAmount(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingrese el monto a pagar"
                />
                
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setCustomAmount(variablePaymentData?.amount.toString())}
                    className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Pago Mínimo
                  </button>
                  <button
                    onClick={() => setCustomAmount((variablePaymentData?.amount * 2).toString())}
                    className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Doble Mínimo
                  </button>
                </div>
                
                {customAmount && parseInt(customAmount) < variablePaymentData?.amount && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    ⚠️ El monto debe ser mayor o igual al pago mínimo
                  </div>
                )}
                
                {customAmount && parseInt(customAmount) > variablePaymentData?.amount && (
                  <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                    ✅ Pago superior al mínimo - Excelente!
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowVariablePayment(false);
                    setVariablePaymentData(null);
                    setCustomAmount('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmVariablePayment}
                  disabled={!customAmount || parseInt(customAmount) < variablePaymentData?.amount}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Confirmar Pago
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">¿Marcar como pagado?</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmPayment(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  NO
                </button>
                <button
                  onClick={confirmPayment}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  SÍ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Formulario */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Nuevo Pago</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(categories).map(([key, category]) => (
                      <option key={key} value={key}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Pago</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      formData.category === 'suscripciones' 
                        ? 'Ej: Netflix, Spotify, YouTube Music' 
                        : formData.category === 'telefonia'
                        ? 'Ej: Tigo, Personal, Claro'
                        : formData.category === 'casas_comerciales'
                        ? 'Ej: Electro Centro, Casa Nissei, Biggie'
                        : 'Ej: Tarjeta Visa, Préstamo Auto'
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.category === 'tarjetas' ? 'Pago Mínimo Mensual' : 'Monto Mensual'}
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(formData.amount)}
                    onChange={(e) => setFormData({
                      ...formData,
                      amount: parseAmount(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      formData.category === 'tarjetas' 
                        ? 'Ej: 150.000 (pago mínimo)'
                        : formData.category === 'suscripciones' 
                        ? 'Ej: Netflix, Spotify, YouTube Music' 
                        : formData.category === 'telefonia'
                        ? 'Ej: 200.000 (plan mensual)'
                        : 'Ej: 500.000'
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Día de vencimiento</label>
                  <select
                    value={formData.dueDay}
                    onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        Día {day} de cada mes
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {!formData.isSubscription && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total de Cuotas</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.totalQuotas}
                        onChange={(e) => setFormData({
                          ...formData,
                          totalQuotas: parseInt(e.target.value) || ''
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: 12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pago</label>
                      <select
                        value={formData.paymentType}
                        onChange={(e) => setFormData({
                          ...formData,
                          paymentType: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="new">Nuevo Pago</option>
                        <option value="existing">Pago en Proceso</option>
                      </select>
                    </div>
                    {formData.paymentType === 'existing' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cuotas Ya Pagadas</label>
                        <input
                          type="number"
                          min="0"
                          max={formData.totalQuotas}
                          value={formData.paidQuotas}
                          onChange={(e) => setFormData({
                            ...formData,
                            paidQuotas: Math.min(parseInt(e.target.value) || 0, formData.totalQuotas)
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Primera Cuota</label>
                      <select
                        value={formData.firstPaymentMonth}
                        onChange={(e) => setFormData({
                          ...formData,
                          firstPaymentMonth: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="current">Este Mes</option>
                        <option value="next">Siguiente Mes</option>
                      </select>
                    </div>
                  </>
                )}

                {formData.isSubscription && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {formData.category === 'telefonia' ? (
                        <Smartphone className="text-blue-600" size={16} />
                      ) : formData.category === 'tarjetas' ? (
                        <CreditCard className="text-blue-600" size={16} />
                      ) : (
                        <Music className="text-blue-600" size={16} />
                      )}
                      <span className="text-sm font-medium text-blue-800">
                        {formData.category === 'telefonia' ? 'Plan Telefónico' : 
                        formData.category === 'tarjetas' ? 'Tarjeta de Crédito' : 
                        'Suscripción'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">
                      {formData.category === 'telefonia' 
                        ? 'Los planes telefónicos no tienen cuotas fijas. Puedes cancelar el contrato cuando desees y se mantiene un historial de pagos.'
                        : formData.category === 'tarjetas'
                        ? 'Las tarjetas de crédito tienen pago mínimo mensual. El monto que ingreses será el pago mínimo obligatorio, pero puedes pagar más cada mes.'
                        : 'Las suscripciones no tienen cuotas fijas. Puedes marcar cada mes como pagado y cancelar cuando desees.'
                      }
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios (opcional)</label>
                  <input
                    type="text"
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      formData.category === 'tarjetas' 
                        ? 'Ej: Visa Banco Itaú, límite 2.000.000' 
                        : formData.category === 'suscripciones' 
                        ? 'Ej: Plan Premium, cuenta familiar' 
                        : formData.category === 'telefonia'
                        ? 'Ej: Plan postpago, línea principal'
                        : formData.category === 'casas_comerciales'
                        ? 'Ej: Cuota 6 de 24, sin interés'
                        : 'Ej: Pagar antes del día 10'
                    }
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Agregar Pago
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edición */}
        {showEditForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Editar Pago</h2>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={editFormData?.category || 'tarjetas'}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value, isSubscription: e.target.value === 'suscripciones' || e.target.value === 'telefonia' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(categories).map(([key, category]) => (
                      <option key={key} value={key}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Pago</label>
                  <input
                    type="text"
                    value={editFormData?.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Mensual</label>
                  <input
                    type="text"
                    value={editFormData?.amount ? formatCurrency(editFormData.amount) : ''}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      amount: parseAmount(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Día de vencimiento</label>
                  <select
                    value={editFormData?.dueDay || 1}
                    onChange={(e) => setEditFormData({ ...editFormData, dueDay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        Día {day} de cada mes
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={editFormData?.startDate || ''}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      startDate: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {!editFormData?.isSubscription && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total de Cuotas</label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData?.totalQuotas || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          totalQuotas: parseInt(e.target.value) || ''
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Primera Cuota</label>
                      <select
                        value={editFormData?.firstPaymentMonth || 'current'}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          firstPaymentMonth: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="current">Este Mes</option>
                        <option value="next">Siguiente Mes</option>
                      </select>
                    </div>
                  </>
                )}

                {editFormData?.isSubscription && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {editFormData.category === 'telefonia' ? (
                        <Smartphone className="text-blue-600" size={16} />
                      ) : (
                        <Music className="text-blue-600" size={16} />
                      )}
                      <span className="text-sm font-medium text-blue-800">
                        {editFormData.category === 'telefonia' ? 'Plan Telefónico' : 'Suscripción'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">
                      {editFormData.category === 'telefonia' 
                        ? 'Este es un plan telefónico sin cuotas fijas con historial de pagos.'
                        : 'Esta es una suscripción sin cuotas fijas con historial de pagos.'
                      }
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios (opcional)</label>
                  <input
                    type="text"
                    value={editFormData?.comments || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, comments: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Banco Inter"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
                <button
                  onClick={() => setShowEditForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManager;