import React, { useState, useEffect } from 'react';
import { onAuthStateChange, loginUser, logoutUser } from '../services/authService';
import { getUserPayments, savePayment, updatePayment, deletePayment } from '../services/paymentService';
import AdminPanel from './AdminPanel.jsx';
import { getUserRole } from '../services/adminService';
import PasswordReset from './PasswordReset.jsx';
import * as XLSX from 'xlsx';
import { resetPassword } from '../services/authService';
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
  Clock,
  Crown,
  History,
  FileSpreadsheet,
  BarChart3,    // <-- AGREGADO
  PieChart,     // <-- AGREGADO
  TrendingUp    // <-- AGREGADO
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
  const [cancelledLoans, setCancelledLoans] = useState([]); // Para préstamos otorgados cancelados
  const [showLoanPayment, setShowLoanPayment] = useState(false); // Modal de pago de préstamo
  const [loanPaymentData, setLoanPaymentData] = useState(null); // Datos del préstamo a pagar
  const [partialPaymentAmount, setPartialPaymentAmount] = useState(''); // Monto del pago parcial
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
    isSubscription: false,
    isLoan: false, // ⭐ AGREGADO con coma correcta
    loanDueDate: '' // ⭐ AGREGADO
  });
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    gender: 'M'
  });
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [showActivePaymentsModal, setShowActivePaymentsModal] = useState(false);
  const [showCompletedPaymentsModal, setShowCompletedPaymentsModal] = useState(false);
  const [searchActivePayments, setSearchActivePayments] = useState('');
  const [searchCompletedPayments, setSearchCompletedPayments] = useState('');
  const [showAdvancedPayment, setShowAdvancedPayment] = useState(false);
  const [advancedPaymentData, setAdvancedPaymentData] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyPayment, setHistoryPayment] = useState(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  // 📊 NUEVOS ESTADOS para el Modal de Resumen (agregar en useState)
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryPeriod, setSummaryPeriod] = useState('monthly'); // 'monthly' | 'annual'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // 📊 FUNCIÓN: Generar resumen mensual/anual
  const generateSummaryData = () => {
    const allPayments = [...payments, ...completedPayments, ...cancelledLoans];
    const allHistory = [];
    
    // Recopilar todo el historial de pagos
    allPayments.forEach(payment => {
      // Historial de pagos normales
      if (payment.paymentHistory && payment.paymentHistory.length > 0) {
        payment.paymentHistory.forEach(record => {
          const recordDate = new Date(record.date);
          allHistory.push({
            ...record,
            paymentId: payment.id,
            paymentName: payment.name,
            category: payment.category,
            categoryName: getCategoryInfo(payment.category).name,
            date: recordDate,
            month: recordDate.getMonth(),
            year: recordDate.getFullYear(),
            type: 'payment'
          });
        });
      }
      
      // Historial de préstamos
      if (payment.loanPayments && payment.loanPayments.length > 0) {
        payment.loanPayments.forEach(record => {
          const recordDate = new Date(record.date);
          allHistory.push({
            ...record,
            paymentId: payment.id,
            paymentName: payment.name,
            category: payment.category,
            categoryName: getCategoryInfo(payment.category).name,
            date: recordDate,
            month: recordDate.getMonth(),
            year: recordDate.getFullYear(),
            type: 'loan'
          });
        });
      }
    });

    if (summaryPeriod === 'monthly') {
      // RESUMEN MENSUAL
      const monthlyData = allHistory.filter(record => 
        record.month === selectedMonth && record.year === selectedYear
      );

      const monthlyStats = {
        totalAmount: monthlyData.reduce((sum, record) => sum + record.amount, 0),
        totalPayments: monthlyData.length,
        categorySummary: {},
        paymentDetails: monthlyData.sort((a, b) => a.date - b.date)
      };

      // Agrupar por categoría
      Object.keys(categories).forEach(categoryKey => {
        const categoryData = monthlyData.filter(record => record.category === categoryKey);
        monthlyStats.categorySummary[categoryKey] = {
          amount: categoryData.reduce((sum, record) => sum + record.amount, 0),
          count: categoryData.length,
          info: categories[categoryKey]
        };
      });

      return monthlyStats;
    } else {
      // RESUMEN ANUAL
      const annualData = allHistory.filter(record => record.year === selectedYear);
      
      const annualStats = {
        totalAmount: annualData.reduce((sum, record) => sum + record.amount, 0),
        totalPayments: annualData.length,
        monthlyBreakdown: {},
        categorySummary: {},
        paymentDetails: annualData.sort((a, b) => a.date - b.date)
      };

      // Breakdown mensual
      for (let month = 0; month < 12; month++) {
        const monthData = annualData.filter(record => record.month === month);
        annualStats.monthlyBreakdown[month] = {
          amount: monthData.reduce((sum, record) => sum + record.amount, 0),
          count: monthData.length,
          monthName: getMonthName(month)
        };
      }

      // Agrupar por categoría
      Object.keys(categories).forEach(categoryKey => {
        const categoryData = annualData.filter(record => record.category === categoryKey);
        annualStats.categorySummary[categoryKey] = {
          amount: categoryData.reduce((sum, record) => sum + record.amount, 0),
          count: categoryData.length,
          info: categories[categoryKey]
        };
      });

      return annualStats;
    }
  };

  // 📊 COMPONENTE: Modal de Resumen
  const SummaryModal = () => {
    const summaryData = generateSummaryData();
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <BarChart3 className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  📊 Resumen {summaryPeriod === 'monthly' ? 'Mensual' : 'Anual'}
                </h2>
                <p className="text-sm text-gray-600">
                  {summaryPeriod === 'monthly' 
                    ? `${monthNames[selectedMonth]} ${selectedYear}`
                    : `Año ${selectedYear}`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSummaryModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Controles de período */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Período:</label>
                <select
                  value={summaryPeriod}
                  onChange={(e) => setSummaryPeriod(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Año:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {summaryPeriod === 'monthly' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Mes:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>{month}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="text-blue-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Total Pagado</h3>
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  ₲{formatCurrency(summaryData.totalAmount)}
                </p>
              </div>
              
              <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <Check className="text-green-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Total Pagos</h3>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {summaryData.totalPayments}
                </p>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-purple-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Promedio por Pago</h3>
                </div>
                <p className="text-3xl font-bold text-purple-600">
                  ₲{formatCurrency(summaryData.totalPayments > 0 ? Math.round(summaryData.totalAmount / summaryData.totalPayments) : 0)}
                </p>
              </div>
            </div>

            {/* Resumen por categorías */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart size={20} />
                Resumen por Categorías
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(summaryData.categorySummary)
                  .filter(([key, data]) => data.amount > 0)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([categoryKey, data]) => {
                    const CategoryIcon = data.info.icon;
                    const percentage = summaryData.totalAmount > 0 ? 
                      ((data.amount / summaryData.totalAmount) * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={categoryKey} className={`${data.info.bgColor} p-4 rounded-lg border ${data.info.borderColor}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <CategoryIcon className={data.info.textColor} size={18} />
                          <span className="font-medium text-gray-700">{data.info.name}</span>
                        </div>
                        <div className="text-lg font-bold text-gray-800">
                          ₲{formatCurrency(data.amount)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {data.count} pagos • {percentage}% del total
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Breakdown mensual (solo para resumen anual) */}
            {summaryPeriod === 'annual' && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar size={20} />
                  Breakdown Mensual {selectedYear}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(summaryData.monthlyBreakdown).map(([monthIndex, data]) => (
                    <div key={monthIndex} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="font-medium text-gray-700">{data.monthName}</div>
                      <div className="text-lg font-bold text-gray-800">
                        ₲{formatCurrency(data.amount)}
                      </div>
                      <div className="text-xs text-gray-500">{data.count} pagos</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista detallada de pagos */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <History size={20} />
                Detalle de Pagos ({summaryData.totalPayments})
              </h3>
              {summaryData.paymentDetails.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {summaryData.paymentDetails.map((record, index) => {
                    const categoryInfo = getCategoryInfo(record.category);
                    const CategoryIcon = categoryInfo.icon;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <div className="flex items-center gap-3">
                          <CategoryIcon className={categoryInfo.textColor} size={16} />
                          <div>
                            <div className="font-medium text-gray-800">{record.paymentName}</div>
                            <div className="text-sm text-gray-600">
                              {categoryInfo.name} • {record.date.toLocaleDateString()}
                              {record.type === 'loan' && record.overdueDays > 0 && (
                                <span className="text-red-600 ml-2">• {record.overdueDays} días atraso</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-800">₲{formatCurrency(record.amount)}</div>
                          {record.quotaNumber && (
                            <div className="text-xs text-gray-500">Cuota {record.quotaNumber}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay pagos registrados para este período
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Mostrando {summaryData.totalPayments} pagos del período seleccionado
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ⭐ COMPONENTE MODAL DE HISTORIAL COMPLETO
  const PaymentHistoryModal = ({ payment, onClose, formatCurrency, getCategoryInfo }) => {
    const [filterType, setFilterType] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc');

    if (!payment || (!payment.paymentHistory && !payment.loanPayments)) return null;

    const categoryInfo = getCategoryInfo(payment.category);
    const CategoryIcon = categoryInfo.icon;

    const getFilteredHistory = () => {
      // Para préstamos usar loanPayments, para otros usar paymentHistory
      const historyData = payment.isLoan ? payment.loanPayments : payment.paymentHistory;
      if (!historyData) return [];
      
      let filtered = [...historyData];

      if (filterType === 'recent') {
        filtered = filtered.filter(record => !record.isHistorical);
      } else if (filterType === 'historical') {
        filtered = filtered.filter(record => record.isHistorical);
      }

      filtered.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });

      return filtered;
    };

  const filteredHistory = getFilteredHistory();
  const historyData = payment.isLoan ? payment.loanPayments : payment.paymentHistory;
  const totalPaid = historyData ? historyData.reduce((sum, record) => sum + record.amount, 0) : 0;
  const historicalPayments = historyData ? historyData.filter(record => record.isHistorical).length : 0;
  const recentPayments = historyData ? historyData.filter(record => !record.isHistorical).length : 0;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`${categoryInfo.bgColor} p-2 rounded-full`}>
                <CategoryIcon className={categoryInfo.textColor} size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Historial Completo de Pagos</h2>
                <p className="text-sm text-gray-600">{payment.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{payment.paymentHistory.length}</div>
                <div className="text-sm text-gray-600">Total Pagos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₲{formatCurrency(totalPaid)}</div>
                <div className="text-sm text-gray-600">Total Pagado</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{historicalPayments}</div>
                <div className="text-sm text-gray-600">Pagos Previos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{recentPayments}</div>
                <div className="text-sm text-gray-600">En el Sistema</div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filtrar:</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los pagos ({historyData ? historyData.length : 0})</option>
                  <option value="recent">Registrados en sistema ({recentPayments})</option>
                  <option value="historical">Pagos previos ({historicalPayments})</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Ordenar:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Más reciente primero</option>
                  <option value="asc">Más antiguo primero</option>
                </select>
              </div>
            </div>
          </div>

            <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 400px)', minHeight: '300px' }}>
            {filteredHistory.length > 0 ? (
              <div className="space-y-3">
                {filteredHistory.map((record, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      record.isHistorical 
                        ? 'border-blue-200 bg-blue-50' 
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar size={16} className={record.isHistorical ? 'text-blue-600' : 'text-green-600'} />
                          <span className="font-semibold text-gray-800">{record.month}</span>
                          {record.isHistorical ? (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              📅 Pago Previo
                            </span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              ✅ En Sistema
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign size={16} className="text-gray-600" />
                          <span className="text-lg font-bold text-gray-800">₲{formatCurrency(record.amount)}</span>
                          
                          {payment.category === 'tarjetas' && record.minimumAmount && (
                            <div className="ml-4">
                              {record.type === 'above_minimum' ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                  💪 Sobre mínimo (₲{formatCurrency(record.minimumAmount)})
                                </span>
                              ) : (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                  Pago mínimo
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {!payment.isSubscription && !payment.isLoan && record.quotaNumber && (
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Cuota {record.quotaNumber} de {payment.totalQuotas}</span>
                            {record.remainingQuotas !== undefined && (
                              <span>• Faltaban: {record.remainingQuotas} cuotas</span>
                            )}
                          </div>

                        )}
                        {payment.isLoan && record.remainingAfterPayment !== undefined && (
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Saldo después del pago: ₲{formatCurrency(record.remainingAfterPayment)}</span>
                            {record.overdueDays > 0 && (
                              <span className="text-red-600">• Atraso: {record.overdueDays} días</span>
                            )}
                          </div>
                        )}

                      </div>

                      <div className="text-right text-sm text-gray-500">
                        <div>{new Date(record.date).toLocaleDateString('es-ES')}</div>
                        <div>{new Date(record.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Archive size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No hay pagos para mostrar con los filtros seleccionados</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Mostrando {filteredHistory.length} de {historyData ? historyData.length : 0} pagos
              </div>
              <button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };


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
    },
    // ⭐ NUEVA CATEGORÍA AGREGADA
    prestamos_otorgados: {
      name: 'Préstamos Otorgados',
      icon: User,
      color: 'emerald',
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200'
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

  // ✅ FUNCIÓN para obtener estadísticas por categoría CORREGIDA: getCategoryStats
  const getCategoryStats = () => {
    const stats = {};
    
    Object.keys(categories).forEach(categoryKey => {
      const categoryPayments = payments.filter(p => p.category === categoryKey);
      const categoryCompleted = completedPayments.filter(p => p.category === categoryKey);
      
      // ⭐ MANTENER el cálculo individual para cada categoría (para las tarjetas estadísticas)
      const totalPending = categoryPayments.reduce((total, payment) => {
        if (payment.isSubscription) {
          // Para suscripciones (telefonía, tarjetas, etc.)
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          
          const alreadyPaidThisMonth = payment.paymentHistory?.some(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
          });
          
          // Solo sumar si NO ha pagado este mes
          return alreadyPaidThisMonth ? total : total + payment.amount;
          
        } else if (payment.isLoan) {
          // Para préstamos otorgados
          return total + payment.remainingAmount;
          
        } else {
          // Para cuotas tradicionales
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
        
        // Verificar si ya pagó la cuota de ESTE PERÍODO de vencimiento (igual que en markAsPaid)
        if (payment.currentMonthPaid && payment.lastPaidAt) {
          const lastPaidDate = new Date(payment.lastPaidAt);
          
          // Si pagó después del último vencimiento, no mostrar
          let lastDueDate;
          if (currentDay >= payment.dueDay) {
            // Ya pasó el vencimiento de este mes
            lastDueDate = new Date(currentYear, currentMonth, payment.dueDay);
          } else {
            // Aún no llega el vencimiento de este mes
            lastDueDate = new Date(currentYear, currentMonth - 1, payment.dueDay);
          }
          
          // Si pagó después del último vencimiento, no mostrar
          if (lastPaidDate >= lastDueDate) {
            return null;
          }
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
        cancelledLoans: cancelledLoans, // ⭐ AGREGADO
        isAuthenticated: authStatus,
        selectedCategory: selectedCategory,
        lastSaved: new Date().toISOString(),
        version: '3.1'
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
              paymentHistory: payment.paymentHistory || [],
              // ⭐ NUEVOS CAMPOS PARA PRÉSTAMOS OTORGADOS
              isLoan: payment.category === 'prestamos_otorgados' || false,
              originalAmount: payment.originalAmount || payment.amount,
              remainingAmount: payment.remainingAmount || payment.amount
            }));
          };

          setPayments(migratePayments(parsedData.payments || []));
          setCompletedPayments(migratePayments(parsedData.completedPayments || []));
          setCancelledLoans(migratePayments(parsedData.cancelledLoans || [])); // ⭐ AGREGADO
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

  // 📊 NUEVA FUNCIÓN: Exportar datos a Excel
  const exportToExcel = () => {
    try {
      // Crear un libro de trabajo
      const workbook = {
        SheetNames: ['Pagos Activos', 'Pagos Completados', 'Préstamos Cancelados', 'Historial Completo', 'Resumen'],
        Sheets: {}
      };

      // 📋 HOJA 1: Pagos Activos
      const activePaymentsData = payments.map(payment => {
        const categoryInfo = getCategoryInfo(payment.category);
        const progress = payment.isSubscription || payment.isLoan ? 
          'N/A' : 
          `${payment.paidQuotas}/${payment.totalQuotas} (${Math.round((payment.paidQuotas / payment.totalQuotas) * 100)}%)`;
        
        return {
          'ID': payment.id,
          'Nombre': payment.name,
          'Categoría': categoryInfo.name,
          'Tipo': payment.isLoan ? 'Préstamo Otorgado' : payment.isSubscription ? 'Suscripción' : 'Cuotas',
          'Monto Mensual': payment.amount,
          'Monto Pendiente': payment.isLoan ? payment.remainingAmount : 
                            payment.isSubscription ? payment.amount : 
                            payment.amount * (payment.totalQuotas - payment.paidQuotas),
          'Progreso': progress,
          'Día Vencimiento': payment.dueDay || 'N/A',
          'Fecha Inicio': payment.startDate,
          'Fecha Venc. Préstamo': payment.loanDueDate || 'N/A',
          'Último Pago': payment.lastPaidAt ? new Date(payment.lastPaidAt).toLocaleDateString() : 'Sin pagos',
          'Comentarios': payment.comments || '',
          'Fecha Creación': payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'
        };
      });

      // 📋 HOJA 2: Pagos Completados
      const completedPaymentsData = completedPayments.map(payment => {
        const categoryInfo = getCategoryInfo(payment.category);
        const totalPaid = payment.isSubscription ? 
          'Variable (Suscripción)' : 
          payment.amount * payment.totalQuotas;
        
        return {
          'ID': payment.id,
          'Nombre': payment.name,
          'Categoría': categoryInfo.name,
          'Tipo': payment.isSubscription ? 'Suscripción' : 'Cuotas',
          'Monto Mensual': payment.amount,
          'Total Pagado': totalPaid,
          'Estado': payment.cancelledAt ? 'Cancelado' : 'Completado',
          'Fecha Completado': payment.completedAt ? new Date(payment.completedAt).toLocaleDateString() : 'N/A',
          'Fecha Cancelado': payment.cancelledAt ? new Date(payment.cancelledAt).toLocaleDateString() : 'N/A',
          'Comentarios': payment.comments || '',
          'Fecha Inicio': payment.startDate
        };
      });

      // 📋 HOJA 3: Préstamos Cancelados
      const cancelledLoansData = cancelledLoans.map(loan => {
        const categoryInfo = getCategoryInfo(loan.category);
        const totalPagos = loan.loanPayments ? loan.loanPayments.length : 0;
        const pagosConAtraso = loan.loanPayments ? loan.loanPayments.filter(p => p.overdueDays > 0).length : 0;
        const maxAtraso = loan.loanPayments && loan.loanPayments.length > 0 ? 
          Math.max(...loan.loanPayments.map(p => p.overdueDays || 0)) : 0;
        
        return {
          'ID': loan.id,
          'Nombre': loan.name,
          'Categoría': categoryInfo.name,
          'Monto Prestado': loan.originalAmount,
          'Monto Recuperado': loan.originalAmount,
          'Total Pagos Recibidos': totalPagos,
          'Pagos con Atraso': pagosConAtraso,
          'Días Atraso Máximo': maxAtraso,
          'Fecha Préstamo': loan.startDate,
          'Fecha Vencimiento': loan.loanDueDate || 'N/A',
          'Fecha Cancelación': loan.cancelledAt ? new Date(loan.cancelledAt).toLocaleDateString() : 'N/A',
          'Comentarios': loan.comments || ''
        };
      });

      // 📋 HOJA 4: Historial Completo de Pagos
      const historialCompleto = [];
      
      // Agregar historial de pagos activos
      payments.forEach(payment => {
        if (payment.paymentHistory && payment.paymentHistory.length > 0) {
          payment.paymentHistory.forEach(record => {
            historialCompleto.push({
              'ID Pago': payment.id,
              'Nombre Pago': payment.name,
              'Categoría': getCategoryInfo(payment.category).name,
              'Estado Pago': 'Activo',
              'Fecha': new Date(record.date).toLocaleDateString(),
              'Monto Pagado': record.amount,
              'Mes/Período': record.month,
              'Número Cuota': record.quotaNumber || 'N/A',
              'Cuotas Restantes': record.remainingQuotas || 'N/A',
              'Tipo Registro': record.isHistorical ? 'Histórico' : 'Sistema',
              'Tipo Pago Tarjeta': record.type || 'N/A',
              'Pago Mínimo Tarjeta': record.minimumAmount || 'N/A'
            });
          });
        }
        
        // Agregar historial de préstamos activos
        if (payment.loanPayments && payment.loanPayments.length > 0) {
          payment.loanPayments.forEach(record => {
            historialCompleto.push({
              'ID Pago': payment.id,
              'Nombre Pago': payment.name,
              'Categoría': getCategoryInfo(payment.category).name,
              'Estado Pago': 'Activo (Préstamo)',
              'Fecha': new Date(record.date).toLocaleDateString(),
              'Monto Pagado': record.amount,
              'Mes/Período': record.month,
              'Saldo Después Pago': record.remainingAfterPayment,
              'Días Atraso': record.overdueDays || 0,
              'Tipo Registro': 'Préstamo',
              'Número Cuota': 'N/A',
              'Cuotas Restantes': 'N/A'
            });
          });
        }
      });

      // Agregar historial de pagos completados
      completedPayments.forEach(payment => {
        if (payment.paymentHistory && payment.paymentHistory.length > 0) {
          payment.paymentHistory.forEach(record => {
            historialCompleto.push({
              'ID Pago': payment.id,
              'Nombre Pago': payment.name,
              'Categoría': getCategoryInfo(payment.category).name,
              'Estado Pago': payment.cancelledAt ? 'Cancelado' : 'Completado',
              'Fecha': new Date(record.date).toLocaleDateString(),
              'Monto Pagado': record.amount,
              'Mes/Período': record.month,
              'Número Cuota': record.quotaNumber || 'N/A',
              'Cuotas Restantes': record.remainingQuotas || 'N/A',
              'Tipo Registro': record.isHistorical ? 'Histórico' : 'Sistema',
              'Tipo Pago Tarjeta': record.type || 'N/A',
              'Pago Mínimo Tarjeta': record.minimumAmount || 'N/A'
            });
          });
        }
      });

      // Agregar historial de préstamos cancelados
      cancelledLoans.forEach(loan => {
        if (loan.loanPayments && loan.loanPayments.length > 0) {
          loan.loanPayments.forEach(record => {
            historialCompleto.push({
              'ID Pago': loan.id,
              'Nombre Pago': loan.name,
              'Categoría': getCategoryInfo(loan.category).name,
              'Estado Pago': 'Préstamo Cancelado',
              'Fecha': new Date(record.date).toLocaleDateString(),
              'Monto Pagado': record.amount,
              'Mes/Período': record.month,
              'Saldo Después Pago': record.remainingAfterPayment,
              'Días Atraso': record.overdueDays || 0,
              'Tipo Registro': 'Préstamo Cancelado',
              'Número Cuota': 'N/A',
              'Cuotas Restantes': 'N/A'
            });
          });
        }
      });

      // 📊 HOJA 5: Resumen General
      const categoryStats = getCategoryStats();
      const resumenData = [];
      
      // Estadísticas por categoría
      Object.entries(categoryStats).forEach(([key, stats]) => {
        resumenData.push({
          'Tipo': 'Categoría',
          'Descripción': stats.info.name,
          'Pagos Activos': stats.active,
          'Pagos Completados': stats.completed,
          'Total Pendiente': stats.totalPending,
          'Porcentaje del Total': stats.totalPending > 0 ? 
            `${Math.round((stats.totalPending / getTotalPending()) * 100)}%` : '0%',
          'Observaciones': `${stats.active + stats.completed} pagos en total`
        });
      });

      // Agregar totales generales
      resumenData.push({
        'Tipo': 'TOTAL GENERAL',
        'Descripción': 'Resumen Global',
        'Pagos Activos': payments.length,
        'Pagos Completados': completedPayments.length + cancelledLoans.length,
        'Total Pendiente': getTotalPending(),
        'Porcentaje del Total': '100%',
        'Observaciones': `${payments.length + completedPayments.length + cancelledLoans.length} pagos registrados`
      });

      // Crear las hojas del Excel
      workbook.Sheets['Pagos Activos'] = XLSX.utils.json_to_sheet(activePaymentsData);
      workbook.Sheets['Pagos Completados'] = XLSX.utils.json_to_sheet(completedPaymentsData);
      workbook.Sheets['Préstamos Cancelados'] = XLSX.utils.json_to_sheet(cancelledLoansData);
      workbook.Sheets['Historial Completo'] = XLSX.utils.json_to_sheet(historialCompleto);
      workbook.Sheets['Resumen'] = XLSX.utils.json_to_sheet(resumenData);

      // Generar y descargar el archivo
      const fileName = `PayFlow-Manager-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      console.log('📊 Archivo Excel exportado correctamente:', fileName);
      alert(`✅ Datos exportados correctamente a ${fileName}`);
    } catch (error) {
      console.error('❌ Error al exportar a Excel:', error);
      alert('❌ Error al exportar los datos a Excel');
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
        paymentType: 'new',
        isLoan: false
      }));
    } else if (formData.category === 'prestamos_otorgados') {
      setFormData(prev => ({
        ...prev,
        isSubscription: false,
        isLoan: true,
        totalQuotas: '',
        paymentType: 'new',
        dueDay: null // ⭐ No usar día de vencimiento para préstamos
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        isSubscription: false,
        isLoan: false
      }));
    }
  }, [formData.category]);

  // UseEffect actual de onAuthStateChange:
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        setUserRole(user.role); // Agregado
        loadUserData(user.uid);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setUserRole(null); // Agregado
        setPayments([]);
        setCompletedPayments([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);  
  // Función para formatear números con puntos como separadores de miles
  const formatCurrency = (amount) => {
    // ⭐ CORRECCIÓN: Manejar valores vacíos o no válidos
    if (!amount || amount === '' || isNaN(amount)) {
      return '';
    }
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

  // Función actualizada para registro con perfil completo
  const handleRegister = async () => {
    if (!registerData.email || !registerData.password || !registerData.firstName || !registerData.lastName) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    const { registerUser } = await import('../services/authService');
    const result = await registerUser(
      registerData.email, 
      registerData.password,
      {
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        gender: registerData.gender
      }
    );
    
    if (result.success) {
      alert(result.message || '¡Cuenta creada exitosamente! Espera la aprobación del administrador.');
      setRegisterData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        gender: 'M'
      });
      setShowRegisterForm(false);
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
        
        const activePayments = userPayments.filter(p => !p.completedAt && (!p.isLoan || p.remainingAmount > 0));
        const completedPayments = userPayments.filter(p => p.completedAt && !p.isLoan);
        const cancelledLoans = userPayments.filter(p => p.isLoan && (p.loanStatus === 'completed' || p.remainingAmount === 0)); // ⭐ AGREGADO
        
        console.log('✅ Pagos activos:', activePayments.length);
        console.log('✅ Pagos completados:', completedPayments.length);
        console.log('✅ Préstamos cancelados:', cancelledLoans.length); // ⭐ AGREGADO
        
        setPayments(activePayments);
        setCompletedPayments(completedPayments);
        setCancelledLoans(cancelledLoans); // ⭐ AGREGADO
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

    // ⭐ VALIDACIÓN CORREGIDA: Solo pedir cuotas para pagos que NO sean suscripciones NI préstamos
    if (!formData.isSubscription && !formData.isLoan && !formData.totalQuotas) {
      alert('Por favor ingresa el total de cuotas');
      return;
    }

    // ⭐ VALIDACIÓN ESPECÍFICA PARA PRÉSTAMOS: Solo verificar fecha de vencimiento
    if (formData.isLoan && !formData.loanDueDate) {
      alert('Por favor ingresa la fecha de vencimiento del préstamo');
      return;
    }

    const newPayment = {
      name: formData.name,
      amount: parseInt(formData.amount),
      startDate: formData.startDate,
      totalQuotas: formData.isSubscription || formData.isLoan ? null : parseInt(formData.totalQuotas),
      paidQuotas: formData.paymentType === 'existing' ? parseInt(formData.paidQuotas) : 0,
      firstPaymentMonth: formData.firstPaymentMonth,
      comments: formData.comments || '',
      category: formData.category,
      dueDay: formData.isLoan ? null : parseInt(formData.dueDay), // ⭐ Solo para no-préstamos
      isSubscription: formData.isSubscription,
      isLoan: formData.isLoan,
      currentMonthPaid: false,
      paymentHistory: []
    };

    // ⭐ CAMPOS ESPECÍFICOS PARA PRÉSTAMOS OTORGADOS
    if (formData.isLoan) {
      newPayment.originalAmount = parseInt(formData.amount);
      newPayment.remainingAmount = parseInt(formData.amount);
      newPayment.loanPayments = []; // Historial de pagos recibidos
      newPayment.loanDueDate = formData.loanDueDate;
    }

    // Crear historial cuotas normales inicial para pagos existentes (cuotas ya pagadas)
    if (!formData.isSubscription && !formData.isLoan && formData.paymentType === 'existing' && formData.paidQuotas > 0) {
      const initialHistory = [];
      const startDate = new Date(newPayment.startDate);
      
      // Crear registros históricos para las cuotas ya pagadas
      for (let i = 1; i <= formData.paidQuotas; i++) {
        let paymentDate;
        
        if (formData.firstPaymentMonth === 'next') {
          // Si la primera cuota es el siguiente mes
          paymentDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
        } else {
          // Si la primera cuota es el mes actual
          paymentDate = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), startDate.getDate());
        }
        
        const historicalRecord = {
          date: paymentDate.toISOString(),
          amount: newPayment.amount,
          quotaNumber: i,
          month: paymentDate.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }),
          remainingQuotas: newPayment.totalQuotas - i,
          isHistorical: true // Marcar como registro histórico
        };
        
        initialHistory.push(historicalRecord);
      }
      
      // Agregar el historial inicial al pago
      newPayment.paymentHistory = initialHistory;
    }

    // 🔥 GUARDAR EN FIREBASE (resto del código sin cambios)
    const result = await savePayment(currentUser.uid, newPayment);
    
    if (result.success) {
      await loadUserData(currentUser.uid);
      
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
        isSubscription: false,
        isLoan: false,
        loanDueDate: ''
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

    // ⭐ NUEVA LÓGICA PARA PRÉSTAMOS OTORGADOS
    if (payment.isLoan) {
      setLoanPaymentData(payment);
      setPartialPaymentAmount('');
      setShowLoanPayment(true);
      return;
    } 
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

    // NUEVO: Si es préstamo, casa comercial o servicio, verificar si ya pagó este mes
    if (!payment.isSubscription && payment.category !== 'tarjetas') {
      // Verificar si ya pagó la cuota de este mes
      if (payment.currentMonthPaid && payment.lastPaidAt) {
        const lastPaidDate = new Date(payment.lastPaidAt);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Si pagó este mes, ofrecer pago adicional
        if (lastPaidDate.getMonth() === currentMonth && lastPaidDate.getFullYear() === currentYear) {
          setAdvancedPaymentData({ payment, type: 'additionalQuota' });
          setShowAdvancedPayment(true);
          return;
        }
      }
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
      // Código existente para suscripciones (no cambiar)
      const currentDate = new Date();
      const paymentRecord = {
        date: currentDate.toISOString(),
        amount: payment.amount,
        month: currentDate.toLocaleDateString('es-ES', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      };

      const updatedPayment = {
        ...payment,
        currentMonthPaid: true,
        lastPaidAt: currentDate.toISOString(),
        paymentHistory: [...(payment.paymentHistory || []), paymentRecord]
      };
      
      const result = await updatePayment(payment.id, {
        currentMonthPaid: true,
        lastPaidAt: updatedPayment.lastPaidAt,
        paymentHistory: updatedPayment.paymentHistory
      });

      if (result.success) {
        await loadUserData(currentUser.uid);
      } else {
        alert('Error al actualizar: ' + result.error);
      }
    } else {
      // ⭐ CÓDIGO ACTUALIZADO PARA CUOTAS TRADICIONALES CON HISTORIAL
      const updatedPayment = {
        ...payment,
        paidQuotas: payment.paidQuotas + 1,
        currentMonthPaid: true
      };

      const currentDate = new Date();
      
      // ⭐ CREAR REGISTRO DE HISTORIAL PARA CUOTAS
      const paymentRecord = {
        date: currentDate.toISOString(),
        amount: payment.amount,
        quotaNumber: updatedPayment.paidQuotas, // Número de cuota pagada
        month: currentDate.toLocaleDateString('es-ES', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        }),
        remainingQuotas: payment.totalQuotas - updatedPayment.paidQuotas
      };

      // ⭐ AGREGAR AL HISTORIAL
      const updatedPaymentHistory = [...(payment.paymentHistory || []), paymentRecord];

      const isCompleted = updatedPayment.paidQuotas >= updatedPayment.totalQuotas;

      if (isCompleted) {
        const result = await updatePayment(payment.id, {
          paidQuotas: updatedPayment.paidQuotas,
          currentMonthPaid: true,
          lastPaidAt: currentDate.toISOString(),
          completedAt: currentDate.toISOString(),
          paymentHistory: updatedPaymentHistory // ⭐ AGREGADO
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
        
        const result = await updatePayment(payment.id, {
          paidQuotas: updatedPayment.paidQuotas,
          currentMonthPaid: true,
          lastPaidAt: currentDate.toISOString(),
          nextPaymentMonth: nextPaymentMonth,
          paymentHistory: updatedPaymentHistory // ⭐ AGREGADO
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

  // ⭐ NUEVA FUNCIÓN: Confirmar pago de préstamo
  const confirmLoanPayment = async () => {
    const payment = loanPaymentData;
    const paidAmount = parseInt(partialPaymentAmount);
    
    if (!paidAmount || paidAmount <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    if (paidAmount > payment.remainingAmount) {
      alert(`El monto no puede ser mayor al saldo pendiente de ₲${formatCurrency(payment.remainingAmount)}`);
      return;
    }

    const currentDate = new Date();
    const today = currentDate.toDateString(); // Para comparar solo fechas, no horas
    
    // ⭐ LÓGICA CORREGIDA: Calcular días de atraso inteligentemente
    let overdueDays = 0;
    
    if (payment.loanDueDate) {
      const dueDate = new Date(payment.loanDueDate);
      
      // Verificar si ya hay pagos realizados HOY
      const paymentsToday = payment.loanPayments?.filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate.toDateString() === today;
      }) || [];
      
      if (paymentsToday.length > 0) {
        // ⭐ SI YA HAY PAGOS HOY: No hay atraso adicional (0 días)
        overdueDays = 0;
      } else {
        // ⭐ SI ES EL PRIMER PAGO DEL DÍA: Calcular atraso normalmente
        if (currentDate > dueDate) {
          // Buscar el último pago realizado
          const lastPayment = payment.loanPayments?.length > 0 
            ? payment.loanPayments[payment.loanPayments.length - 1] 
            : null;
          
          if (!lastPayment) {
            // Primer pago en absoluto: calcular desde fecha de vencimiento
            const diffTime = currentDate - dueDate;
            overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          } else {
            // Ya hay pagos anteriores: verificar si hay atraso desde el último pago
            const lastPaymentDate = new Date(lastPayment.date);
            const daysSinceLastPayment = Math.ceil((currentDate - lastPaymentDate) / (1000 * 60 * 60 * 24));
            
            // Si han pasado más de 30 días desde el último pago, hay atraso
            if (daysSinceLastPayment > 30) {
              overdueDays = daysSinceLastPayment - 30;
            } else {
              overdueDays = 0; // Pago dentro del período razonable
            }
          }
        } else {
          // El préstamo aún no ha vencido
          overdueDays = 0;
        }
      }
    }
    
    const paymentRecord = {
      date: currentDate.toISOString(),
      amount: paidAmount,
      month: currentDate.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      remainingAfterPayment: payment.remainingAmount - paidAmount,
      overdueDays: overdueDays
    };

    const newRemainingAmount = payment.remainingAmount - paidAmount;
    const updatedLoanPayments = [...(payment.loanPayments || []), paymentRecord];

    // Si se pagó todo, mover a préstamos cancelados
    if (newRemainingAmount === 0) {
      const result = await updatePayment(payment.id, {
        remainingAmount: 0,
        loanPayments: updatedLoanPayments,
        lastPaidAt: currentDate.toISOString(),
        cancelledAt: currentDate.toISOString(),
        loanStatus: 'completed'
      });

      if (result.success) {
        await loadUserData(currentUser.uid);
      } else {
        alert('Error al completar préstamo: ' + result.error);
      }
    } else {
      // Pago parcial, actualizar monto restante
      const result = await updatePayment(payment.id, {
        remainingAmount: newRemainingAmount,
        loanPayments: updatedLoanPayments,
        lastPaidAt: currentDate.toISOString()
      });

      if (result.success) {
        await loadUserData(currentUser.uid);
      } else {
        alert('Error al actualizar préstamo: ' + result.error);
      }
    }

    setShowLoanPayment(false);
    setLoanPaymentData(null);
    setPartialPaymentAmount('');
  };

  // Confirmar pago anticipado
  const confirmAdvancedPayment = async () => {
    const { payment } = advancedPaymentData;
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const paymentRecord = {
      date: nextMonth.toISOString(),
      amount: payment.amount,
      // ⭐ FORMATO ACTUALIZADO: Fecha completa para pagos anticipados
      month: nextMonth.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    };

    const updatedPaymentHistory = [...(payment.paymentHistory || []), paymentRecord];
    
    const result = await updatePayment(payment.id, {
      paymentHistory: updatedPaymentHistory
    });

    if (result.success) {
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
      // ⭐ FORMATO ACTUALIZADO: Fecha completa para tarjetas
      month: currentDate.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      type: paidAmount === payment.amount ? 'minimum' : 'above_minimum'
    };

    const updatedPayment = {
      ...payment,
      lastPaidAt: currentDate.toISOString(),
      paymentHistory: [...(payment.paymentHistory || []), paymentRecord]
    };

    const result = await updatePayment(payment.id, {
      lastPaidAt: updatedPayment.lastPaidAt,
      paymentHistory: updatedPayment.paymentHistory
    });

    if (result.success) {
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
      
      // ⭐ EXCLUIR estas categorías del Total Pendiente
      if (payment.category === 'telefonia' || 
          payment.category === 'tarjetas' || 
          payment.category === 'servicios') {
        return total; // No sumar nada de estas categorías
      }
      
      if (payment.isSubscription) {
        // Para suscripciones (solo quedan las otras categorías)
        return total + payment.amount;
        
      } else if (payment.isLoan) {
        // ⭐ PARA PRÉSTAMOS OTORGADOS: Usar remainingAmount
        return total + payment.remainingAmount;
        
      } else {
        // ⭐ PARA CUOTAS TRADICIONALES (Préstamos, Casas Comerciales)
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

  // ⭐ NUEVA FUNCIÓN PARA ABRIR EL MODAL DE HISTORIAL
  const openHistoryModal = (payment) => {
    setHistoryPayment(payment);
    setShowHistoryModal(true);
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
      <>
      {/* Modal de recuperación de contraseña - AGREGAR AQUÍ */}
      {showPasswordReset && (
        <PasswordReset onBack={() => setShowPasswordReset(false)} />
      )}

      {/* Modal de registro - AGREGAR ESTE MODAL COMPLETO */}
      {showRegisterForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Crear Cuenta</h2>
              <button
                onClick={() => setShowRegisterForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="tu@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingresa tu contraseña"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Juan"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={registerData.lastName}
                    onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Pérez"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                <select
                  value={registerData.gender}
                  onChange={(e) => setRegisterData({ ...registerData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowRegisterForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegister}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Registrarse
              </button>
            </div>
          </div>
        </div>
      )}


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
                onClick={() => setShowRegisterForm(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors mt-2"
              >
                Crear Cuenta
              </button>

              {/* Botón de recuperación de contraseña */}
              <button
                onClick={() => setShowPasswordReset(true)}
                className="w-full text-orange-600 hover:text-orange-800 py-2 text-sm transition-colors mt-2"
              >
                ¿Olvidaste tu contraseña?
              </button>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-black-800">
                  <strong>Sistema Seguimiento de Pagos </strong><br/>
                  developed by<br/>
                  MATIASMART
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Obtener pagos filtrados para mostrar
  const filteredPayments = getFilteredPayments(payments);
  const filteredCompletedPayments = getFilteredPayments(completedPayments);
  const upcomingDueDates = getUpcomingDueDates();
  // ⭐ NUEVA FUNCIÓN: Calcular días de atraso para préstamos
  const calculateOverdueDays = (loanDueDate) => {
    if (!loanDueDate) return 0;
    
    const today = new Date();
    const dueDate = new Date(loanDueDate);
    
    // Solo calcular atraso si ya pasó la fecha de vencimiento
    if (today <= dueDate) return 0;
    
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // ⭐ NUEVA FUNCIÓN
  const getMaxOverdueRecorded = (loanPayments = []) => {
    if (!loanPayments || loanPayments.length === 0) return 0;
    
    const overdueDays = loanPayments.map(payment => payment.overdueDays || 0);
    return Math.max(...overdueDays);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-2xl shadow-lg">
                  <DollarSign className="text-white" size={28} />
                </div>
                <div className="absolute -top-1 -right-1 bg-green-500 w-3 h-3 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
                  PayFlow <span className="text-blue-600">Manager</span>
                </h1>
                <p className="text-sm text-gray-600 font-medium">Gestión de Pagos Mensuales</p>
              </div>
            </div>
          {/* Saludo personalizado */}
          {currentUser && currentUser.firstName && (
            <div className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-gray-700">
                ¡Hola, Bienvenido! 👋
              </p>
              <p className="text-lg font-bold text-blue-600">
                {currentUser.firstName} {currentUser.lastName}
              </p>
            </div>
          )}
          
          {/* Mostrar rol del usuario */}
          {userRole && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              userRole === 'admin' 
                ? 'bg-purple-100 text-purple-600 border border-purple-200' 
                : 'bg-blue-100 text-blue-600 border border-blue-200'
            }`}>
              Usuario: {userRole === 'admin' ? '👑 Admin' : '👤 Activo'}
            </div>
          )}
        </div>
          <div className="flex gap-2">
            {/* Botón Admin (solo para admins) */}
            {userRole === 'admin' && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Crown size={18} /> Panel Admin
              </button>
            )}
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
 
                      <label className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 rounded cursor-pointer">
                        <Upload size={16} /> Importar Datos Formato Json
                        <input
                          type="file"
                          accept=".json"
                          onChange={importData}
                          className="hidden"
                        />
                      </label>
                    
                  </div>

                  {/* 📊 Exportación a Excel - NUEVA SECCIÓN */}
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-600 mb-3">📊 Exportación Avanzada</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          exportToExcel();
                          setShowSettingsMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 rounded"
                      >
                        <FileSpreadsheet size={16} /> Exportar a Excel (con historiales)
                      </button>
                      <button
                        onClick={exportData}
                        className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2 rounded"
                      >
                        <Download size={16} /> Exportar Datos (JSON)
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowSummaryModal(true);
                        setShowSettingsMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 flex items-center gap-2 rounded"
                    >
                      <BarChart3 size={16} /> Ver Resumen Mensual/Anual
                    </button>
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
          <ul className="flex border-b border-gray-300 overflow-x-auto">
            <li>
              <button
                onClick={() => setActiveTab('active')}
                className={`py-2 px-4 font-medium whitespace-nowrap ${
                  activeTab === 'active' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'
                }`}
              >
                Pagos Activos ({filteredPayments.length})
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-2 px-4 font-medium whitespace-nowrap ${
                  activeTab === 'completed' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'
                }`}
              >
                Pagos Completados ({filteredCompletedPayments.length})
              </button>
            </li>
            {/* ⭐ NUEVA PESTAÑA PARA PRÉSTAMOS CANCELADOS */}
            <li>
              <button
                onClick={() => setActiveTab('cancelledLoans')}
                className={`py-2 px-4 font-medium whitespace-nowrap ${
                  activeTab === 'cancelledLoans' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-600'
                }`}
              >
                Préstamos Cancelados ({getFilteredPayments(cancelledLoans).length})
              </button>
            </li>
          </ul>
        </nav>

        {/* ⭐ NUEVA SECCIÓN: Préstamos Cancelados */}
        {activeTab === 'cancelledLoans' && (
          <div className="p-6">
            {getFilteredPayments(cancelledLoans).length === 0 ? (
              <div className="text-center py-12">
                <User size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">
                  {selectedCategory === 'all' 
                    ? 'No tienes préstamos cancelados' 
                    : 'No tienes préstamos cancelados en esta categoría'
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {getFilteredPayments(cancelledLoans).map((loan) => {
                  const categoryInfo = getCategoryInfo(loan.category);
                  const CategoryIcon = categoryInfo.icon;
                  
                  return (
                    <div key={loan.id} className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`${categoryInfo.bgColor} p-1.5 rounded-full`}>
                          <CategoryIcon className={categoryInfo.textColor} size={14} />
                        </div>
                        <span className={`text-xs font-medium ${categoryInfo.textColor}`}>
                          {categoryInfo.name}
                        </span>
                        <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                          CANCELADO
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-lg text-gray-800">{loan.name}</h3>
                      
                      <div className="mt-3 bg-white p-3 rounded-lg">
                        <div className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">Monto Prestado:</span>
                            <span className="font-bold text-gray-800">₲{formatCurrency(loan.originalAmount)}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">Total Recuperado:</span>
                            <span className="font-bold text-emerald-600">
                              ₲{formatCurrency(loan.originalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cancelado:</span>
                            <span className="text-sm text-gray-500">
                              {new Date(loan.cancelledAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Historial completo de pagos recibidos */}
                      {loan.loanPayments && loan.loanPayments.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-medium text-gray-600">
                              📋 Historial de Pagos:
                            </h4>
                            {loan.loanPayments.length > 3 && (
                              <button
                                onClick={() => openHistoryModal(loan)}
                                className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-600 px-2 py-1 rounded-full flex items-center gap-1 transition-colors"
                              >
                                <History size={12} />
                                Ver todo ({loan.loanPayments.length})
                              </button>
                            )}
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {loan.loanPayments.slice(-3).map((record, index) => (
                              <div key={index} className="text-xs text-gray-500 bg-white p-2 rounded mb-1 border border-gray-100">
                                <div className="font-medium text-gray-700">
                                  • {new Date(record.date).toLocaleDateString()}: Pago ₲{formatCurrency(record.amount)}
                                </div>
                                {record.overdueDays > 0 ? (
                                  <div className="text-red-600 ml-2">
                                    con Días Atraso: <span className="font-bold">{record.overdueDays}</span>
                                  </div>
                                ) : (
                                  <div className="text-green-600 ml-2">
                                    ✅ Pago a tiempo
                                  </div>
                                )}
                                <div className="text-gray-400 ml-2">
                                  (Pendiente: ₲{formatCurrency(record.remainingAfterPayment)})
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {loan.loanPayments.length > 3 && (
                            <button
                              onClick={() => openHistoryModal(loan)}
                              className="text-xs text-emerald-600 hover:text-emerald-800 mt-1 block transition-colors"
                            >
                              +{loan.loanPayments.length - 3} pagos más... (Click para ver todo)
                            </button>
                          )}
                          
                          {/* ⭐ RESUMEN DE ATRASOS (solo mostrar si es menos de 4 pagos, sino aparece en el modal) */}
                          {loan.loanPayments.length <= 3 && (
                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                              <div className="font-medium text-gray-700 mb-1">📊 Resumen:</div>
                              <div className="flex justify-between">
                                <span>Total de pagos:</span>
                                <span>{loan.loanPayments.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Pagos con atraso:</span>
                                <span className="text-red-600">
                                  {loan.loanPayments.filter(p => p.overdueDays > 0).length}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Atraso máximo:</span>
                                <span className="text-red-600 font-bold">
                                  {getMaxOverdueRecorded(loan.loanPayments)} días
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Atraso promedio:</span>
                                <span className="text-orange-600">
                                  {loan.loanPayments.length > 0 
                                    ? Math.round(loan.loanPayments.reduce((sum, p) => sum + (p.overdueDays || 0), 0) / loan.loanPayments.length)
                                    : 0} días
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {loan.comments && (
                        <div className="mt-2 text-sm text-gray-500 italic">
                          📝 {loan.comments}
                        </div>
                      )}

                      <div className="mt-2">
                        <div className="bg-emerald-200 rounded-full h-2">
                          <div className="bg-emerald-600 h-2 rounded-full w-full"></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block text-center">
                          ✓ Préstamo Cancelado - 100% Recuperado
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
                          <p className="text-xl font-bold text-blue-600">
                            {payment.isLoan ? (
                              <>
                                ₲{formatCurrency(payment.remainingAmount)}
                                <span className="text-sm text-gray-500 block">
                                  de ₲{formatCurrency(payment.originalAmount)} prestado
                                </span>
                              </>
                            ) : (
                              `₲${formatCurrency(payment.amount)}/mes`
                            )}
                          </p>
                          
                          {payment.dueDay && (
                            <p className="text-sm text-gray-600 mt-1">
                              📅 Vence el día {payment.dueDay} de cada mes
                            </p>
                          )}
                        </div>
                      </div>

                          {!payment.isSubscription && !payment.isLoan && (
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
                              
                              {/* ⭐ NUEVO: Historial de pagos para cuotas tradicionales */}
                              {payment.paymentHistory && payment.paymentHistory.length > 0 && (
                                <div className="mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-medium text-gray-600">
                                      📋 Historial de Pagos:
                                    </h4>
                                    {payment.paymentHistory.length > 3 && (
                                      <button
                                        onClick={() => openHistoryModal(payment)}
                                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1 transition-colors"
                                      >
                                        <History size={12} />
                                        Ver todo ({payment.paymentHistory.length})
                                      </button>
                                    )}
                                  </div>
                                  <div className="max-h-20 overflow-y-auto">
                                    {payment.paymentHistory.slice(-3).map((record, index) => (
                                      <div key={index} className="text-xs text-gray-500 bg-gray-50 p-1 rounded mb-1">
                                        <div className="flex justify-between items-center">
                                          <span>
                                            • {record.month}: ₲{formatCurrency(record.amount)}
                                          </span>
                                          {record.isHistorical && (
                                            <span className="text-blue-500 text-xs">📅</span>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-400 ml-2">
                                          Cuota {record.quotaNumber} de {payment.totalQuotas}
                                          {record.remainingQuotas > 0 && ` • Faltan: ${record.remainingQuotas}`}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {payment.paymentHistory.length > 3 && (
                                    <button
                                      onClick={() => openHistoryModal(payment)}
                                      className="text-xs text-blue-600 hover:text-blue-800 mt-1 block transition-colors"
                                    >
                                      +{payment.paymentHistory.length - 3} pagos más... (Click para ver todo)
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* ⭐ MODAL DE HISTORIAL COMPLETO */}
                              {showHistoryModal && historyPayment && (
                                <PaymentHistoryModal
                                  payment={historyPayment}
                                  onClose={() => {
                                    setShowHistoryModal(false);
                                    setHistoryPayment(null);
                                  }}
                                  formatCurrency={formatCurrency}
                                  getCategoryInfo={getCategoryInfo}
                                />
                              )}

                            </div>
                          )}

                      {payment.isLoan && (
                        <div className="mt-3 bg-emerald-50 p-3 rounded-lg">
                          <div className="text-sm">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">Prestado:</span>
                              <span className="font-medium">₲{formatCurrency(payment.originalAmount)}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600">Pagado:</span>
                              <span className="font-medium text-emerald-600">
                                ₲{formatCurrency(payment.originalAmount - payment.remainingAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between mb-2">
                              <span className="text-gray-600">Pendiente:</span>
                              <span className="font-bold text-red-600">₲{formatCurrency(payment.remainingAmount)}</span>
                            </div>
                            
                            {/* ⭐ NUEVA SECCIÓN: Días de Atraso */}
                            {payment.loanDueDate && (
                              <div className="flex justify-between mb-2 p-2 bg-white rounded">
                                <span className="text-gray-600">Vencimiento:</span>
                                <span className="text-sm">{new Date(payment.loanDueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            
                            {payment.loanDueDate && payment.loanPayments && payment.loanPayments.length > 0 && (
                              (() => {
                                // Calcular el máximo atraso registrado en todos los pagos
                                const maxOverdue = Math.max(...payment.loanPayments.map(p => p.overdueDays || 0));
                                
                                return maxOverdue > 0 ? (
                                  <div className="flex justify-between p-2 bg-red-100 rounded border border-red-200">
                                    <span className="text-red-700 font-medium">Días Atraso Máx:</span>
                                    <span className="font-bold text-red-700">
                                      {maxOverdue} días
                                    </span>
                                  </div>
                                ) : null;
                              })()
                            )}
                          </div>

                          {/* Barra de progreso para préstamos */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                              <div
                                className="bg-emerald-600 h-2 rounded-full"
                                style={{ 
                                  width: `${((payment.originalAmount - payment.remainingAmount) / payment.originalAmount) * 100}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 block text-center">
                              {Math.round(((payment.originalAmount - payment.remainingAmount) / payment.originalAmount) * 100)}% recuperado
                            </span>
                          </div>

                          {/* ⭐ HISTORIAL ACTUALIZADO: Pagos Recibidos con días de atraso */}
                          {payment.loanPayments && payment.loanPayments.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-medium text-gray-600">
                                  📋 Pagos Recibidos:
                                </h4>
                                {payment.loanPayments.length > 3 && (
                                  <button
                                    onClick={() => openHistoryModal(payment)}
                                    className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-600 px-2 py-1 rounded-full flex items-center gap-1 transition-colors"
                                  >
                                    <History size={12} />
                                    Ver todo ({payment.loanPayments.length})
                                  </button>
                                )}
                              </div>
                              <div className="max-h-24 overflow-y-auto">
                                {payment.loanPayments.slice(-3).map((record, index) => (
                                  <div key={index} className="text-xs text-gray-500 bg-white p-2 rounded mb-1">
                                    <div>
                                      • {new Date(record.date).toLocaleDateString()}: Pago ₲{formatCurrency(record.amount)}
                                    </div>
                                    {record.overdueDays > 0 && (
                                      <div className="text-red-600 ml-2">
                                        con Días Atraso: {record.overdueDays}
                                      </div>
                                    )}
                                    <div className="text-emerald-600 ml-2">
                                      (Pendiente: ₲{formatCurrency(record.remainingAfterPayment)})
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {payment.loanPayments.length > 3 && (
                                <button
                                  onClick={() => openHistoryModal(payment)}
                                  className="text-xs text-emerald-600 hover:text-emerald-800 mt-1 block transition-colors"
                                >
                                  +{payment.loanPayments.length - 3} pagos más... (Click para ver todo)
                                </button>
                              )}
                            </div>
                          )}
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
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-medium text-gray-600">
                                  📋 Historial de Pagos:
                                </h4>
                                {payment.paymentHistory.length > 3 && (
                                  <button
                                    onClick={() => openHistoryModal(payment)}
                                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1 transition-colors"
                                  >
                                    <History size={12} />
                                    Ver todo ({payment.paymentHistory.length})
                                  </button>
                                )}
                              </div>
                              <div className="max-h-20 overflow-y-auto">
                                {payment.paymentHistory.slice(-3).map((record, index) => (
                                  <div key={index} className="text-xs text-gray-500 bg-gray-50 p-1 rounded mb-1">
                                    <div className="flex justify-between items-center">
                                      <span>
                                        • {record.month}: ₲{formatCurrency(record.amount)}
                                      </span>
                                      {record.isHistorical && (
                                        <span className="text-blue-500 text-xs">📅</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400 ml-2">
                                      Cuota {record.quotaNumber} de {payment.totalQuotas}
                                      {record.remainingQuotas > 0 && ` • Faltan: ${record.remainingQuotas}`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {payment.paymentHistory.length > 3 && (
                                <button
                                  onClick={() => openHistoryModal(payment)}
                                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 block transition-colors"
                                >
                                  +{payment.paymentHistory.length - 3} pagos más... (Click para ver todo)
                                </button>
                              )}
                            </div>
                          )}

                          {/* ⭐ MODAL DE HISTORIAL COMPLETO */}
                          {showHistoryModal && historyPayment && (
                            <PaymentHistoryModal
                              payment={historyPayment}
                              onClose={() => {
                                setShowHistoryModal(false);
                                setHistoryPayment(null);
                              }}
                              formatCurrency={formatCurrency}
                              getCategoryInfo={getCategoryInfo}
                            />
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
                        <Check size={16} /> 
                        {payment.isLoan ? 'Registrar Pago' : 'Marcar Pagado'}
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

                      {/* ⭐ CÓDIGO Historial Cuotas Tradicional ANTES DE LOS COMENTARIOS: */}
                      {!payment.isSubscription && !payment.isLoan && payment.paymentHistory && payment.paymentHistory.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-xs font-medium text-gray-600 mb-2">
                            📋 Historial Completo de Pagos:
                          </h4>
                          <div className="max-h-32 overflow-y-auto">
                            {payment.paymentHistory.map((record, index) => (
                              <div key={index} className="text-xs text-gray-500 bg-white p-2 rounded mb-1 border border-gray-100">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">
                                    • {record.month}: ₲{formatCurrency(record.amount)}
                                  </span>
                                  {record.isHistorical ? (
                                    <span className="text-blue-500 text-xs" title="Pago previo al registro">📅</span>
                                  ) : (
                                    <span className="text-green-500 text-xs" title="Pago registrado en el sistema">✅</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 ml-2">
                                  Cuota {record.quotaNumber} de {payment.totalQuotas}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* ⭐ RESUMEN ESTADÍSTICO */}
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                            <div className="font-medium text-gray-700 mb-1">📊 Resumen:</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex justify-between">
                                <span>Total cuotas:</span>
                                <span>{payment.totalQuotas}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total pagado:</span>
                                <span>₲{formatCurrency(payment.amount * payment.totalQuotas)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Cuota mensual:</span>
                                <span>₲{formatCurrency(payment.amount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Duración:</span>
                                <span>{payment.totalQuotas} meses</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

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
                    : advancedPaymentData?.type === 'additionalQuota'
                    ? '¿Deseas registrar otro pago más para este mes?'
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
                    } else if (advancedPaymentData?.type === 'additionalQuota') {
                      // Para préstamos/casas, confirmar pago normal
                      setPaymentToConfirm(advancedPaymentData.payment.id);
                      setShowConfirmPayment(true);
                      setShowAdvancedPayment(false);
                    } else {
                      // Para suscripciones, pago anticipado
                      confirmAdvancedPayment();
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {advancedPaymentData?.type === 'additionalPayment' ? 'SÍ, PAGAR' : 
                  advancedPaymentData?.type === 'additionalQuota' ? 'SÍ, PAGAR' :
                  'SÍ, PAGO ANTICIPADO'}
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
                  value={customAmount ? formatCurrency(customAmount) : ''} // ⭐ CORRECCIÓN
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

        {/* ⭐ NUEVO MODAL: Pago de Préstamo Otorgado */}
        {showLoanPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                💰 Registrar Pago Recibido
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>{loanPaymentData?.name}</strong>
                </p>
                
                <div className="bg-emerald-50 p-3 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Monto Original:</span>
                      <p className="font-bold text-emerald-700">
                        ₲{formatCurrency(loanPaymentData?.originalAmount || 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Saldo Pendiente:</span>
                      <p className="font-bold text-red-600">
                        ₲{formatCurrency(loanPaymentData?.remainingAmount || 0)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto que te pagó:
                </label>
                <input
                  type="text"
                  value={partialPaymentAmount ? formatCurrency(partialPaymentAmount) : ''}
                  onChange={(e) => setPartialPaymentAmount(parseAmount(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ingrese el monto recibido"
                />
                
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setPartialPaymentAmount((loanPaymentData?.remainingAmount / 2).toString())}
                    className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Mitad (₲{formatCurrency((loanPaymentData?.remainingAmount || 0) / 2)})
                  </button>
                  <button
                    onClick={() => setPartialPaymentAmount(loanPaymentData?.remainingAmount.toString())}
                    className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Pago Total
                  </button>
                </div>
                
                {partialPaymentAmount && parseInt(partialPaymentAmount) > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">
                      <div className="flex justify-between">
                        <span>Monto a recibir:</span>
                        <span className="font-bold text-emerald-600">
                          ₲{formatCurrency(partialPaymentAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quedaría pendiente:</span>
                        <span className="font-bold text-red-600">
                          ₲{formatCurrency((loanPaymentData?.remainingAmount || 0) - parseInt(partialPaymentAmount || 0))}
                        </span>
                      </div>
                    </div>
                    
                    {parseInt(partialPaymentAmount || 0) === loanPaymentData?.remainingAmount && (
                      <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                        ✅ ¡Préstamo completado! Se moverá a "Préstamos Cancelados"
                      </div>
                    )}
                  </div>
                )}
                
                {partialPaymentAmount && parseInt(partialPaymentAmount) > (loanPaymentData?.remainingAmount || 0) && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    ⚠️ El monto no puede ser mayor al saldo pendiente
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLoanPayment(false);
                    setLoanPaymentData(null);
                    setPartialPaymentAmount('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmLoanPayment}
                  disabled={!partialPaymentAmount || parseInt(partialPaymentAmount) <= 0 || parseInt(partialPaymentAmount) > (loanPaymentData?.remainingAmount || 0)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[95vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-800">Nuevo Pago</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* ⭐ CONTENIDO CON SCROLL MEJORADO */}
              <div className="flex-1 overflow-y-auto p-6">
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
                          : formData.category === 'prestamos_otorgados'
                          ? 'Ej: Préstamo a Juan Pérez'
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
                      {formData.category === 'tarjetas' ? 'Pago Mínimo Mensual' : 
                      formData.category === 'prestamos_otorgados' ? 'Monto Total del Préstamo' : 
                      'Monto Mensual'}
                    </label>
                    <input
                      type="text"
                      value={formData.amount ? formatCurrency(formData.amount) : ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        amount: parseAmount(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={
                        formData.category === 'tarjetas' 
                          ? 'Ej: 150.000 (pago mínimo)'
                          : formData.category === 'prestamos_otorgados'
                          ? 'Ej: 500.000 (monto total prestado)'
                          : formData.category === 'suscripciones' 
                          ? 'Ej: 50.000 (mensual)' 
                          : formData.category === 'telefonia'
                          ? 'Ej: 200.000 (plan mensual)'
                          : 'Ej: 500.000'
                      }
                    />
                  </div>
                  
                    {/* ⭐ CAMPO CONDICIONAL: Solo mostrar "Día de vencimiento" para categorías que NO sean préstamos otorgados */}
                    {!formData.isLoan && (
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
                    )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {!formData.isSubscription && !formData.isLoan && (
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

                  {formData.isLoan && (
                    <>
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="text-emerald-600" size={16} />
                          <span className="text-sm font-medium text-emerald-800">
                            Préstamo Otorgado
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 mb-2">
                          Registra el monto total que prestaste. Podrás ir marcando los pagos parciales que recibas hasta que se complete la deuda.
                        </p>
                        <div className="bg-emerald-100 p-2 rounded text-xs text-emerald-800">
                          💡 <strong>Ejemplo:</strong> Si prestaste ₱500.000 a Juan, podrás registrar cuando te pague ₱200.000, luego ₱150.000, etc., 
                          hasta que complete los ₱500.000.
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha de Vencimiento del Préstamo
                        </label>
                        <input
                          type="date"
                          value={formData.loanDueDate || ''}
                          onChange={(e) => setFormData({ ...formData, loanDueDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Fecha acordada para el pago completo del préstamo
                        </p>
                      </div>
                    </>
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
                          : formData.category === 'prestamos_otorgados'
                          ? 'Ej: Préstamo a Juan Pérez, fecha acordada 30/12/2024'
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
              </div>
              
              {/* ⭐ BOTONES FIJOS EN LA PARTE INFERIOR */}
              <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
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
          {/* Modal Admin Panel */}
          {showAdminPanel && (
            <AdminPanel
              currentUser={currentUser}
              onClose={() => setShowAdminPanel(false)}
            />
          )}        
      </div>
      {/* Modal de Resumen - AGREGAR ESTA LÍNEA */}
{showSummaryModal && <SummaryModal />}
    </div>
  );
};

export default PaymentManager;
