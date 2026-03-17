import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Building2, FileText, Package, Image as ImageIcon, CheckCircle2, 
  ChevronRight, ChevronLeft, Upload, AlertCircle, Plus, Trash2, 
  Link as LinkIcon, FileUp, Mail, Smartphone, Eye, Search, 
  LogIn, UserPlus, Clock, History, MessageSquare, Truck,
  DollarSign, Info, LayoutDashboard, ShieldCheck, TrendingUp, MapPin,
  Leaf, Sprout, ClipboardCheck, Store, Calendar, Users, LogOut, X
} from 'lucide-react';

// --- 1. Cấu hình Trạng thái hồ sơ ---
const STATUS_CONFIG = {
  'NOP_HO_SO': { label: 'Hồ sơ mới', color: 'bg-gray-100 text-gray-600', icon: <FileUp size={14}/> },
  'DANG_THAM_DINH': { label: 'Đang thẩm định', color: 'bg-emerald-100 text-emerald-600', icon: <Search size={14}/> },
  'CHO_BO_SUNG': { label: 'Cần bổ sung', color: 'bg-orange-100 text-orange-600', icon: <AlertCircle size={14}/> },
  'KIEM_DINH_MAU': { label: 'Kiểm định mẫu', color: 'bg-purple-100 text-purple-600', icon: <Sprout size={14}/> },
  'DA_DUYET': { label: 'Đối tác chính thức', color: 'bg-green-600 text-white', icon: <CheckCircle2 size={14}/> },
  'KHONG_PHU_HOP': { label: 'Chưa phù hợp', color: 'bg-red-100 text-red-600', icon: <Trash2 size={14}/> },
};

const MD_STRUCTURE = {
  MD1: { name: "MD1 - Nông Sản Tươi", categories: ["Trái Cây Việt", "Trái Cây Nhập", "Rau Củ Quả Tươi"] },
  MD2: { name: "MD2 - Thực Phẩm Tươi Sống", categories: ["Thịt Tươi", "Thủy Hải Sản", "Trứng & Đồ Mát"] },
  MD3: { name: "MD3 - Đồ Khô & Gia Vị", categories: ["Đồ Khô", "Hạt & Trái Cây Khô", "Gia Vị & Đồ Đóng Hộp"] },
  MD4: { name: "MD4 - Thực Phẩm Chế Biến", categories: ["Đồ Ăn Sẵn", "Bánh Ngọt & Bơ Sữa", "Đồ Ăn Chế Biến"] },
  MD5: { name: "MD5 - Sản Phẩm Hữu Cơ", categories: ["Sản Phẩm Organic", "Thực Phẩm Chức Năng", "Sản Phẩm Chăm Sóc Cá Nhân"] }
};

const ALL_CATEGORIES = Object.values(MD_STRUCTURE).flatMap(md => md.categories);

// --- 2. Khởi tạo Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDl0PXFoLm5pv5m8aNHW6VLwrxDs0byzCA",
  authDomain: "farmers-market-portal.firebaseapp.com",
  projectId: "farmers-market-portal",
  storageBucket: "farmers-market-portal.firebasestorage.app",
  messagingSenderId: "875336592790",
  appId: "1:875336592790:web:de4f61278891270c73c1b7",
  measurementId: "G-KGNM9B7EEG"
};

const appId = 'farmers-market-v2';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['NOP_HO_SO'];
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); 
  const [adminRole, setAdminRole] = useState('MANAGER');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [authError, setAuthError] = useState(null);
  
  const [formData, setFormData] = useState({
    companyName: '', taxId: '', email: '', phone: '', address: '',
    creditTerm: '30', leadTime: '24', moq: '', deliveryType: 'Store',
    legalDocs: {
      businessLicense: { type: 'file', value: null },
      safetyCert: { type: 'file', value: null },
      qualityCert: { type: 'file', value: null }
    },
    products: [{ id: Date.now(), name: '', category: '', origin: '', costPrice: '', sellingPrice: '', unit: '', shelfLife: '', seasonality: 'Quanh năm' }]
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (view === 'login') setView('supplier_dashboard');
      } else {
        setView('login');
      }
    });
    return () => unsubscribe();
  }, [view]);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'submissions');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubmissions(docs);
    });
    return () => unsubscribe();
  }, [user]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError("Tên miền này chưa được cấp phép.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => signOut(auth);

  const updateProduct = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const submitRegistration = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = {
        ...formData,
        userId: user.uid,
        userEmail: user.email,
        status: 'NOP_HO_SO',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'submissions'), data);
      setView('supplier_dashboard');
      setStep(1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (subId, newStatus) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'submissions', subId);
    await updateDoc(docRef, { status: newStatus });
  };

  const adminFilteredSubmissions = submissions.filter(sub => {
    if (adminRole === 'MANAGER') return true;
    const mdCats = MD_STRUCTURE[adminRole]?.categories || [];
    return sub.products?.some(p => mdCats.includes(p.category));
  });

  const AuthErrorModal = () => (
    authError ? (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[250] flex items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
          <div className="bg-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-red-600">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-black mb-2">Lỗi xác thực tên miền</h3>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Bạn cần vào Firebase Console {'>'} Authentication {'>'} Settings {'>'} Authorized Domains và thêm miền <strong>usercontent.goog</strong> để sử dụng trên trang Preview.
          </p>
          <button onClick={() => setAuthError(null)} className="w-full py-4 bg-[#1B4332] text-white rounded-2xl font-bold uppercase text-xs">Đã hiểu</button>
        </div>
      </div>
    ) : null
  );

  const LoginView = () => (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
      <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl text-center border border-emerald-50">
          <div className="w-24 h-24 bg-emerald-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3">
            <Leaf size={48} />
          </div>
          <h1 className="text-3xl font-black text-[#1B4332] mb-10 uppercase tracking-tight">Đối Tác Đăng Nhập</h1>
          <button onClick={handleGoogleSignIn} className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 flex items-center justify-center gap-3 transition-all mb-4">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
            Tiếp tục với Google
          </button>
          <button onClick={() => setView('admin_dashboard')} className="text-emerald-700 font-bold text-[10px] uppercase tracking-widest hover:underline">Quản trị nội bộ MD</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans antialiased">
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="animate-bounce bg-emerald-600 p-5 rounded-[2rem] text-white shadow-2xl">
            <Sprout size={40} className="animate-pulse" />
          </div>
        </div>
      )}

      <AuthErrorModal />

      <nav className="bg-white/80 backdrop-blur-md border-b border-emerald-50 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('supplier_dashboard')}>
          <div className="bg-emerald-600 w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg"><Leaf size={22}/></div>
          <div>
            <span className="font-black text-[#1B4332] text-xl tracking-tighter block leading-none">Farmers Market</span>
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Portal v2.2</span>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-gray-400 uppercase leading-none">Tài khoản</p>
              <p className="text-[11px] font-bold text-emerald-800">{user.email}</p>
            </div>
            <button onClick={handleSignOut} className="w-10 h-10 bg-gray-50 border border-emerald-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><LogOut size={20}/></button>
          </div>
        )}
      </nav>

      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {!user && view === 'login' ? (
          <LoginView />
        ) : (
          <div className="space-y-8 animate-in fade-in">
            {view === 'supplier_dashboard' && (
              <div className="space-y-8">
                <div className="bg-[#1B4332] p-12 rounded-[3.5rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><Leaf size={150}/></div>
                  <div className="relative z-10">
                    <h2 className="text-4xl font-black tracking-tight mb-2 uppercase italic">Chào đối tác!</h2>
                    <p className="text-emerald-200">Chào mừng bạn quay lại hệ thống Farmers Market.</p>
                  </div>
                  <button onClick={() => setView('supplier_form')} className="relative z-10 bg-white text-[#1B4332] px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-emerald-50 transition-all">
                    Chào hàng mới
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-50 shadow-sm flex items-center justify-between">
                    <div><p className="text-[10px] font-black text-gray-400 uppercase">Hồ sơ đã gửi</p><p className="text-4xl font-black text-[#1B4332] mt-2">{submissions.filter(s => s.userId === user?.uid).length}</p></div>
                    <div className="bg-[#F0F5F2] p-4 rounded-2xl"><History className="text-emerald-600"/></div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-50 shadow-sm flex items-center justify-between">
                    <div><p className="text-[10px] font-black text-gray-400 uppercase">Đang thẩm định</p><p className="text-4xl font-black text-[#1B4332] mt-2">{submissions.filter(s => s.userId === user?.uid && s.status === 'DANG_THAM_DINH').length}</p></div>
                    <div className="bg-[#F0F5F2] p-4 rounded-2xl"><Search className="text-blue-600"/></div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-50 shadow-sm flex items-center justify-between">
                    <div><p className="text-[10px] font-black text-gray-400 uppercase">Đã mở mã hàng</p><p className="text-4xl font-black text-[#1B4332] mt-2">{submissions.filter(s => s.userId === user?.uid && s.status === 'DA_DUYET').length}</p></div>
                    <div className="bg-[#F0F5F2] p-4 rounded-2xl"><CheckCircle2 className="text-green-600"/></div>
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] shadow-xl border border-emerald-50 overflow-hidden">
                  <div className="px-10 py-6 border-b border-emerald-50 bg-[#FDFBF7] font-black text-emerald-800 uppercase tracking-widest text-xs">Danh sách hồ sơ chào hàng</div>
                  <div className="divide-y divide-emerald-50">
                    {submissions.filter(s => s.userId === user?.uid).length === 0 ? (
                      <div className="p-24 text-center text-gray-300 font-bold italic uppercase tracking-widest text-[10px]">Chưa có hồ sơ nào được ghi nhận</div>
                    ) : (
                      submissions.filter(s => s.userId === user?.uid).map(sub => (
                        <div key={sub.id} className="p-8 flex justify-between items-center group hover:bg-emerald-50/10 transition-all">
                          <div className="space-y-2">
                            <StatusBadge status={sub.status} />
                            <h4 className="text-2xl font-bold text-[#1B4332] uppercase tracking-tight">{sub.companyName}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                               Gửi ngày: {sub.createdAt ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : 'Đang xử lý'}
                            </p>
                          </div>
                          <button className="w-14 h-14 bg-[#F0F5F2] text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><Eye size={24}/></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {view === 'supplier_form' && (
               <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-emerald-50">
                  <button onClick={() => setView('supplier_dashboard')} className="mb-8 font-bold text-gray-400 uppercase text-[10px] tracking-widest hover:text-emerald-700 flex items-center gap-2 transition-all"><ChevronLeft size={16}/> Quay lại</button>
                  <h3 className="text-3xl font-black text-[#1B4332] mb-10 border-b border-emerald-50 pb-6 uppercase italic">Phiếu đăng ký sản phẩm mới</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tên pháp nhân công ty *</label>
                      <input type="text" placeholder="Tên Công ty" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-emerald-500 font-bold transition-all" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Mã số thuế *</label>
                      <input type="text" placeholder="MST" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-emerald-500 font-bold transition-all" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-2xl mb-10 border border-emerald-100 flex items-start gap-4">
                     <Info className="text-emerald-600 shrink-0" size={20}/>
                     <p className="text-xs text-emerald-800 font-medium leading-relaxed">Bộ phận MD Farmers Market sẽ liên hệ trực tiếp với bạn qua email <strong>{user?.email}</strong> để yêu cầu bổ sung hồ sơ kỹ thuật chi tiết sau khi xem xét thông tin cơ bản này.</p>
                  </div>
                  <button onClick={submitRegistration} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                    Xác nhận gửi hồ sơ chào hàng <TrendingUp size={24}/>
                  </button>
               </div>
            )}

            {view === 'admin_dashboard' && (
              <div className="space-y-10">
                 <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-12 rounded-[4rem] border border-emerald-50 shadow-sm">
                    <h2 className="text-4xl font-black text-[#1B4332] uppercase italic tracking-tighter">Hệ thống Thẩm định MD</h2>
                    <select className="bg-[#1B4332] text-white px-8 py-4 rounded-[2rem] font-black text-xs uppercase outline-none shadow-2xl" value={adminRole} onChange={e => setAdminRole(e.target.value)}>
                      <option value="MANAGER">Tất cả ngành hàng</option>
                      <option value="MD1">MD1 - Nông Sản Tươi</option>
                      <option value="MD2">MD2 - Thực Phẩm Tươi Sống</option>
                    </select>
                 </div>

                 <div className="bg-white rounded-[4rem] border border-emerald-50 shadow-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead><tr className="bg-[#FDFBF7] text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-emerald-50"><th className="px-12 py-8">Nhà cung cấp</th><th className="px-12 py-8 text-center">Trạng thái</th><th className="px-12 py-8 text-center">Xử lý MD</th></tr></thead>
                      <tbody className="divide-y divide-emerald-50">
                        {adminFilteredSubmissions.length === 0 ? (
                          <tr><td colSpan={3} className="p-32 text-center text-gray-300 font-black italic uppercase tracking-widest text-[10px]">Hệ thống chưa có hồ sơ mới</td></tr>
                        ) : (
                          adminFilteredSubmissions.map(sub => (
                            <tr key={sub.id} className="hover:bg-emerald-50/20 transition-all">
                              <td className="px-12 py-10">
                                <p className="font-black text-[#1B4332] text-lg uppercase">{sub.companyName}</p>
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{sub.userEmail}</span>
                              </td>
                              <td className="px-12 py-10 text-center"><StatusBadge status={sub.status} /></td>
                              <td className="px-12 py-10">
                                 <div className="flex justify-center gap-3">
                                    <button onClick={() => updateStatus(sub.id, 'DANG_THAM_DINH')} title="Thẩm định" className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm"><Search size={20}/></button>
                                    <button onClick={() => updateStatus(sub.id, 'DA_DUYET')} title="Duyệt mở mã" className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all flex items-center justify-center shadow-sm"><CheckCircle2 size={20}/></button>
                                 </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="py-14 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] border-t border-emerald-50 bg-white">
        © 2024 FARMERS MARKET PORTAL • CLOUD INFRASTRUCTURE v5.0.6
      </footer>
    </div>
  );
};

export default App;
