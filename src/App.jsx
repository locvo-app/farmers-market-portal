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
  Building2, FileText, Package, CheckCircle2, ChevronLeft, 
  AlertCircle, Plus, Eye, Search, LogIn, History, 
  TrendingUp, Leaf, Sprout, LogOut, Loader2, Info,
  MapPin, Clock, DollarSign, Store, Trash2, ChevronRight,
  Link as LinkIcon, FileUp, ShieldCheck, Image as ImageIcon, X
} from 'lucide-react';

// --- 1. Cấu hình Trạng thái & Ngành hàng ---
const STATUS_CONFIG = {
  'NOP_HO_SO': { label: 'Hồ sơ mới', color: 'bg-gray-100 text-gray-600', icon: <History size={14}/> },
  'DANG_THAM_DINH': { label: 'Đang thẩm định', color: 'bg-emerald-100 text-emerald-600', icon: <Search size={14}/> },
  'CHO_BO_SUNG': { label: 'Cần bổ sung', color: 'bg-orange-100 text-orange-600', icon: <AlertCircle size={14}/> },
  'DA_DUYET': { label: 'Đối tác chính thức', color: 'bg-green-600 text-white', icon: <CheckCircle2 size={14}/> },
};

const MD_STRUCTURE = {
  MD1: { name: "MD1 - Nông Sản Tươi", categories: ["Trái Cây Việt", "Trái Cây Nhập", "Rau Củ Quả Tươi"] },
  MD2: { name: "MD2 - Thực Phẩm Tươi Sống", categories: ["Thịt Tươi", "Thủy Hải Sản", "Trứng & Đồ Mát"] },
  MD3: { name: "MD3 - Đồ Khô & Gia Vị", categories: ["Đồ Khô", "Hạt & Trái Cây Khô", "Gia Vị & Đồ Đóng Hộp"] },
  MD4: { name: "MD4 - Thực Phẩm Chế Biến", categories: ["Đồ Ăn Sẵn", "Bánh Ngọt & Bơ Sữa", "Đồ Ăn Chế Biến"] },
  MD5: { name: "MD5 - Sản Phẩm Hữu Cơ", categories: ["Sản Phẩm Organic", "Thực Phẩm Chức Năng", "Sản Phẩm Chăm Sóc Cá Nhân"] }
};

const ALL_CATEGORIES = Object.values(MD_STRUCTURE).flatMap(md => md.categories);

// --- 2. Cấu hình Firebase ---
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
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); 
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [adminRole, setAdminRole] = useState('MANAGER');

  const [formData, setFormData] = useState({
    companyName: '', taxId: '', email: '', phone: '', address: '',
    creditTerm: '30', leadTime: '24', moq: '', deliveryType: 'Store',
    legalDocs: {
      businessLicense: { type: 'file', value: null },
      safetyCert: { type: 'file', value: null },
      qualityCert: { type: 'file', value: null }
    },
    products: [{ id: Date.now(), name: '', category: '', costPrice: '', sellingPrice: '', origin: '', seasonality: 'Quanh năm' }]
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && view === 'login') setView('supplier_dashboard');
    });
    return () => unsubscribe();
  }, [view]);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'submissions');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubmissions(docs);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setErrorMsg("Lỗi đồng bộ dữ liệu: " + error.message);
    });
    return () => unsubscribe();
  }, [user]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (err) { 
      console.error("Login error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg("Tên miền chưa được cấp phép. Vui lòng thêm 'usercontent.goog' vào Authorized Domains trong Firebase Console.");
      } else {
        setErrorMsg("Lỗi đăng nhập: " + err.message); 
      }
    } finally { 
      setLoading(false); 
    }
  };

  const updateProduct = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const addProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { id: Date.now(), name: '', category: '', costPrice: '', sellingPrice: '', origin: '', seasonality: 'Quanh năm' }]
    }));
  };

  const removeProduct = (id) => {
    if (formData.products.length > 1) {
      setFormData(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== id)
      }));
    }
  };

  const updateLegalDoc = (key, type, value) => {
    setFormData(prev => ({
      ...prev,
      legalDocs: { ...prev.legalDocs, [key]: { type, value } }
    }));
  };

  const submitRegistration = async () => {
    if (!user) {
      setErrorMsg("Vui lòng đăng nhập để gửi hồ sơ.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = {
        ...formData,
        userId: user.uid,
        userEmail: user.email,
        status: 'NOP_HO_SO',
        createdAt: serverTimestamp(),
      };
      
      // Ghi dữ liệu vào đường dẫn quy định
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'submissions'), data);
      
      setView('supplier_dashboard');
      setStep(1);
      // Reset form
      setFormData({
        companyName: '', taxId: '', email: '', phone: '', address: '',
        creditTerm: '30', leadTime: '24', moq: '', deliveryType: 'Store',
        legalDocs: {
          businessLicense: { type: 'file', value: null },
          safetyCert: { type: 'file', value: null },
          qualityCert: { type: 'file', value: null }
        },
        products: [{ id: Date.now(), name: '', category: '', costPrice: '', sellingPrice: '', origin: '', seasonality: 'Quanh năm' }]
      });
    } catch (err) { 
      console.error("Submit error:", err);
      setErrorMsg("Lỗi khi gửi hồ sơ: " + err.message + ". Hãy kiểm tra cấu hình Firestore Rules.");
    } finally { setLoading(false); }
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 5));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

  // --- Views ---

  if (!user && view === 'login') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl text-center border border-emerald-50">
           <div className="w-24 h-24 bg-emerald-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3">
             <Leaf size={48} />
           </div>
           <h1 className="text-3xl font-black text-[#1B4332] mb-10 uppercase tracking-tight italic leading-none">Farmers Market<br/><span className="text-sm tracking-widest opacity-50 font-sans not-italic uppercase">Supplier Hub</span></h1>
           <button onClick={handleGoogleSignIn} className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 flex items-center justify-center gap-3 transition-all mb-4 shadow-sm">
             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
             Tiếp tục với Google
           </button>
           {errorMsg && (
             <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-bold leading-relaxed mb-4">
               {errorMsg}
             </div>
           )}
           <button onClick={() => setView('admin_dashboard')} className="text-emerald-700 font-bold text-[10px] uppercase tracking-widest hover:underline mt-4">Hệ thống MD Nội bộ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans antialiased">
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="animate-bounce bg-emerald-600 p-5 rounded-[2rem] text-white shadow-2xl flex flex-col items-center gap-3 text-center">
             <Loader2 size={40} className="animate-spin" />
             <span className="text-[10px] font-black uppercase tracking-widest px-4">Đang xử lý dữ liệu Cloud...</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
           <AlertCircle size={20} />
           <span className="text-xs font-bold">{errorMsg}</span>
           <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-red-700 rounded-lg"><X size={16}/></button>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b border-emerald-50 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('supplier_dashboard')}>
          <div className="bg-emerald-600 w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg shadow-emerald-100"><Leaf size={22}/></div>
          <span className="font-black text-[#1B4332] text-xl tracking-tighter italic uppercase">Farmers Market</span>
        </div>
        {user && (
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-bold text-emerald-800 hidden sm:block italic underline">{user.email}</span>
             <button onClick={() => signOut(auth)} className="w-10 h-10 bg-gray-50 border border-emerald-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all shadow-inner"><LogOut size={20}/></button>
          </div>
        )}
      </nav>

      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {view === 'supplier_dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-[#1B4332] p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><Leaf size={150}/></div>
              <div className="relative z-10 text-center md:text-left">
                <h2 className="text-4xl font-black tracking-tight mb-2 uppercase italic">Xin chào Đối tác!</h2>
                <p className="text-emerald-200">Bắt đầu nộp hồ sơ và theo dõi kết quả thẩm định từ MD.</p>
              </div>
              <button onClick={() => { setView('supplier_form'); setStep(1); }} className="relative z-10 bg-white text-[#1B4332] px-10 py-5 rounded-[2rem] font-black uppercase text-xs shadow-2xl hover:bg-emerald-50 transition-all">
                Chào sản phẩm mới
              </button>
            </div>

            <div className="bg-white rounded-[3rem] shadow-xl border border-emerald-50 overflow-hidden">
              <div className="px-10 py-6 border-b border-emerald-50 bg-[#FDFBF7] font-black text-emerald-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                <History size={16}/> Lịch sử nộp hồ sơ của bạn
              </div>
              <div className="divide-y divide-emerald-50">
                {submissions.filter(s => s.userId === user?.uid).length === 0 ? (
                  <div className="p-24 text-center text-gray-300 font-bold italic uppercase tracking-widest text-[10px] opacity-50">Chưa có dữ liệu trên Cloud</div>
                ) : (
                  submissions.filter(s => s.userId === user?.uid).map(sub => (
                    <div key={sub.id} className="p-8 flex justify-between items-center hover:bg-emerald-50/5 transition-all group">
                      <div className="space-y-2">
                        <StatusBadge status={sub.status} />
                        <h4 className="text-2xl font-bold text-[#1B4332] uppercase tracking-tight">{sub.companyName}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic opacity-70">
                           ID: #{sub.id.slice(-6).toUpperCase()} • Ngày gửi: {sub.createdAt ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : 'Mới'}
                        </p>
                      </div>
                      <button className="w-14 h-14 bg-[#F0F5F2] text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm"><Eye size={24}/></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'supplier_form' && (
          <div className="bg-white rounded-[3.5rem] shadow-2xl border border-emerald-50 p-10 md:p-16 animate-in slide-in-from-bottom-4">
             {/* Progress Steps */}
             <div className="mb-14 flex justify-between relative max-w-3xl mx-auto px-6">
                <div className="absolute top-5 left-12 right-12 h-1 bg-gray-100 -z-0 rounded-full"></div>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="z-10 flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${step >= i ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border-gray-200 text-gray-300'}`}>
                      {step > i ? <CheckCircle2 size={18} /> : i}
                    </div>
                    <span className={`text-[9px] mt-3 font-black uppercase tracking-widest ${step >= i ? 'text-emerald-800' : 'text-gray-300'}`}>
                      {i === 1 ? 'Đối tác' : i === 2 ? 'Hồ sơ' : i === 3 ? 'Vận hành' : i === 4 ? 'Hàng hóa' : 'Gửi'}
                    </span>
                  </div>
                ))}
             </div>

             <form className="max-w-4xl mx-auto space-y-12" onSubmit={e => e.preventDefault()}>
                {step === 1 && (
                  <div className="space-y-8 animate-in fade-in">
                    <h3 className="text-2xl font-black text-[#1B4332] flex items-center gap-3 tracking-tight uppercase italic"><Building2 size={32} className="text-emerald-600"/> 1. Thông tin đối tác</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tên Công ty chính thức *</label>
                        <input type="text" placeholder="Tên Công ty (Theo GPKD)" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold transition-all shadow-inner outline-none" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Mã số thuế *</label>
                        <input type="text" placeholder="MST" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold transition-all shadow-inner outline-none" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Email liên hệ *</label>
                        <input type="email" placeholder="example@domain.com" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold outline-none shadow-inner" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Số điện thoại *</label>
                        <input type="tel" placeholder="09xxx" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold outline-none shadow-inner" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8 animate-in fade-in">
                    <h3 className="text-2xl font-black text-[#1B4332] flex items-center gap-3 tracking-tight uppercase italic"><FileText size={32} className="text-emerald-600"/> 2. Hồ sơ pháp lý</h3>
                    <div className="grid grid-cols-1 gap-5">
                      {['Giấy phép KD', 'Chứng nhận ATTP', 'VietGAP/Organic'].map(label => (
                        <div key={label} className="p-6 border-2 border-gray-50 rounded-[2.5rem] bg-gray-50/30 flex justify-between items-center group hover:bg-white hover:border-emerald-200 transition-all">
                           <div className="flex items-center gap-4 text-[#1B4332]">
                              <div className="bg-emerald-50 p-3 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all"><FileText size={20}/></div>
                              <span className="font-black uppercase text-xs tracking-widest">{label}</span>
                           </div>
                           <button type="button" className="px-5 py-2.5 bg-white border-2 border-gray-100 text-[10px] font-black uppercase rounded-2xl hover:bg-emerald-50 transition-all flex items-center gap-2"><FileUp size={16}/> Tải file Scan</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-between items-center border-b border-emerald-50 pb-6">
                      <h3 className="text-2xl font-black text-[#1B4332] flex items-center gap-3 tracking-tight uppercase italic"><Package size={32} className="text-emerald-600"/> 4. Danh mục hàng hóa</h3>
                      <button type="button" onClick={addProduct} className="bg-[#1B4332] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-800 shadow-xl transition-all"><Plus size={18}/> Thêm dòng</button>
                    </div>
                    <div className="space-y-8 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                      {formData.products.map((p, idx) => (
                        <div key={p.id} className="p-8 border-2 border-emerald-50 rounded-[3rem] bg-white relative hover:shadow-lg transition-all">
                          <div className="flex justify-between items-center mb-8">
                            <span className="bg-[#1B4332] text-white text-[10px] font-black px-5 py-2 rounded-full uppercase italic tracking-tighter">Mặt hàng #{idx + 1}</span>
                            {formData.products.length > 1 && <button type="button" onClick={() => removeProduct(p.id)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={24}/></button>}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase">Tên sản phẩm đầy đủ *</label>
                               <input type="text" placeholder="Tên sản phẩm" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold text-sm shadow-inner outline-none" value={p.name} onChange={e => updateProduct(p.id, 'name', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase">Giá vốn *</label>
                               <input type="number" placeholder="VNĐ" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold text-sm shadow-inner outline-none" value={p.costPrice} onChange={e => updateProduct(p.id, 'costPrice', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase">Giá lẻ dự kiến *</label>
                               <input type="number" placeholder="VNĐ" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold text-sm shadow-inner outline-none" value={p.sellingPrice} onChange={e => updateProduct(p.id, 'sellingPrice', e.target.value)} />
                            </div>
                            <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center justify-between font-black text-emerald-800 uppercase tracking-tighter italic">
                              <span>Biên LN:</span>
                              <span className="text-xl font-black">{p.costPrice && p.sellingPrice ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="text-center py-20 space-y-10 animate-in zoom-in-95">
                    <div className="w-28 h-28 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner relative"><ShieldCheck size={64} className="relative z-10" /></div>
                    <h3 className="text-4xl font-black text-[#1B4332] tracking-tight uppercase italic leading-none">Xác nhận nộp hồ sơ<br/><span className="text-sm opacity-50 uppercase tracking-widest font-sans not-italic">Farmers Market Cloud</span></h3>
                    <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-md mx-auto italic">"Tôi cam đoan các thông tin và hồ sơ pháp lý đính kèm là hoàn toàn trung thực."</p>
                  </div>
                )}

                <div className="mt-16 pt-12 border-t border-emerald-50 flex justify-between items-center">
                  <button type="button" onClick={handleBack} className={`font-black text-gray-300 hover:text-[#1B4332] uppercase text-[10px] tracking-widest ${step === 1 ? 'invisible' : ''}`}>Quay lại</button>
                  <div className="flex gap-4">
                    {step < 5 ? (
                      <button type="button" onClick={handleNext} className="bg-emerald-600 text-white px-14 py-5 rounded-[2rem] font-black shadow-xl hover:bg-emerald-700 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2">Tiếp tục <ChevronRight size={16}/></button>
                    ) : (
                      <button type="button" onClick={submitRegistration} disabled={loading} className="bg-[#1B4332] text-white px-16 py-6 rounded-[2rem] font-black shadow-2xl hover:bg-black transition-all flex items-center gap-3 uppercase text-xs italic tracking-widest">Gửi hồ sơ ngay <TrendingUp size={24}/></button>
                    )}
                  </div>
                </div>
             </form>
          </div>
        )}

        {view === 'admin_dashboard' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-12 rounded-[4rem] border border-emerald-50 shadow-sm shadow-emerald-900/5">
                <div>
                  <h2 className="text-4xl font-black text-[#1B4332] tracking-tight italic uppercase leading-none">Thẩm định MD<br/><span className="text-sm opacity-50 uppercase tracking-widest font-sans not-italic">Cloud Control</span></h2>
                  <div className="flex items-center gap-3 mt-4"><span className="bg-[#1B4332] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-emerald-900/20">Hub Admin</span></div>
                </div>
                <button onClick={() => setView('supplier_dashboard')} className="px-8 py-4 bg-emerald-50 text-emerald-800 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all">Quay lại Dashboard</button>
             </div>

             <div className="bg-white rounded-[4rem] border border-emerald-50 shadow-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-[#FDFBF7] text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-emerald-50"><th className="px-12 py-8">Nhà cung cấp</th><th className="px-12 py-8 text-center">Trạng thái</th><th className="px-12 py-8 text-center">Xử lý MD</th></tr></thead>
                  <tbody className="divide-y divide-emerald-50">
                    {submissions.length === 0 ? (
                      <tr><td colSpan="3" className="p-32 text-center text-gray-300 font-black italic tracking-widest uppercase text-xs opacity-50">Dữ liệu Cloud đang trống</td></tr>
                    ) : (
                      submissions.map(sub => (
                        <tr key={sub.id} className="hover:bg-emerald-50/20 transition-all">
                          <td className="px-12 py-10">
                            <p className="font-black text-[#1B4332] text-lg uppercase tracking-tight leading-none mb-1">{sub.companyName}</p>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{sub.userEmail}</span>
                          </td>
                          <td className="px-12 py-10 text-center"><StatusBadge status={sub.status} /></td>
                          <td className="px-12 py-10">
                             <div className="flex justify-center gap-3">
                                <button title="Thẩm định" className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm shadow-emerald-100"><Search size={20}/></button>
                                <button title="Duyệt" className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all flex items-center justify-center shadow-sm shadow-green-100"><CheckCircle2 size={20}/></button>
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
      </main>
      <footer className="py-14 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] border-t border-emerald-50 bg-white">
        © 2024 FARMERS MARKET • CLOUD HUB v5.1.0
      </footer>
    </div>
  );
};

export default App;
