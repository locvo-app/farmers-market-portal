import React, { useState, useEffect, useRef } from 'react';
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
  addDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Building2, FileText, Package, CheckCircle2, ChevronLeft, 
  AlertCircle, Plus, Eye, Search, LogIn, History, 
  TrendingUp, Leaf, LogOut, Loader2, Info,
  MapPin, Clock, Trash2, ChevronRight,
  FileUp, ShieldCheck, Image as ImageIcon, X,
  User, Briefcase, Phone, Mail, CheckCircle, ShoppingBag
} from 'lucide-react';

// --- 1. Cấu hình Firebase ---
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

// --- 2. Danh mục ngành hàng ---
const MD_STRUCTURE = {
  MD1: { name: "MD1 - Nông Sản Tươi", categories: ["Trái Cây Việt", "Trái Cây Nhập", "Rau Củ Quả Tươi"] },
  MD2: { name: "MD2 - Thực Phẩm Tươi Sống", categories: ["Thịt Tươi", "Thủy Hải Sản", "Trứng & Đồ Mát"] },
  MD3: { name: "MD3 - Đồ Khô & Gia Vị", categories: ["Đồ Khô", "Hạt & Trái Cây Khô", "Gia Vị & Đồ Đóng Hộp"] },
};

const ALL_CATEGORIES = Object.values(MD_STRUCTURE).flatMap(md => md.categories);

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); 
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form State chuẩn 7-Eleven
  const [formData, setFormData] = useState({
    companyName: '', taxId: '', companyAddress: '',
    registrantName: '', registrantPosition: '', registrantPhone: '', registrantEmail: '',
    creditTerm: '30', leadTime: '24', moq: '', deliveryType: 'Store',
    legalDocs: {
      businessLicense: { name: '', file: null },
      safetyCert: { name: '', file: null }
    },
    products: [{ 
      id: Date.now(), name: '', category: '', costPrice: '', sellingPrice: '', 
      origin: '', existingDistribution: '', complianceDoc: null, productImage: null 
    }]
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
    });
    return () => unsubscribe();
  }, [user]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err) { setErrorMsg("Lỗi đăng nhập: " + err.message); } 
    finally { setLoading(false); }
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
      products: [...prev.products, { id: Date.now(), name: '', category: '', costPrice: '', sellingPrice: '', origin: '', existingDistribution: '', complianceDoc: null, productImage: null }]
    }));
  };

  const handleFileUpload = (e, target, productId = null) => {
    const file = e.target.files[0];
    if (!file) return;
    if (productId) {
      updateProduct(productId, target, file.name);
    } else {
      setFormData(prev => ({
        ...prev,
        legalDocs: { ...prev.legalDocs, [target]: { name: file.name, file: file } }
      }));
    }
  };

  const submitRegistration = async () => {
    if (!user) return;
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
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'submissions'), data);
      setShowSuccess(true);
      setLoading(false);
    } catch (err) { 
      console.error("Submit error:", err);
      setErrorMsg("Lỗi khi gửi hồ sơ: " + err.message);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowSuccess(false);
    setView('supplier_dashboard');
    setStep(1);
    setFormData({
      companyName: '', taxId: '', companyAddress: '',
      registrantName: '', registrantPosition: '', registrantPhone: '', registrantEmail: '',
      creditTerm: '30', leadTime: '24', moq: '', deliveryType: 'Store',
      legalDocs: { businessLicense: { name: '', file: null }, safetyCert: { name: '', file: null } },
      products: [{ id: Date.now(), name: '', category: '', costPrice: '', sellingPrice: '', origin: '', existingDistribution: '', complianceDoc: null, productImage: null }]
    });
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 5));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

  // --- Views ---

  if (!user && view === 'login') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl text-center border border-emerald-50">
           <div className="w-24 h-24 bg-emerald-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3"><Leaf size={48} /></div>
           <h1 className="text-3xl font-black text-[#1B4332] mb-10 uppercase tracking-tight italic leading-none">Farmers Market<br/><span className="text-sm tracking-widest opacity-50 font-sans not-italic uppercase">Supplier Hub</span></h1>
           <button onClick={handleGoogleSignIn} className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 flex items-center justify-center gap-3 transition-all">
             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
             Tiếp tục với Google
           </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center animate-in fade-in">
        <div className="max-w-xl w-full bg-white p-16 rounded-[4rem] shadow-2xl space-y-8 border border-emerald-50">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg"><CheckCircle size={60} /></div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-[#1B4332] uppercase italic leading-tight">Gửi hồ sơ thành công!</h2>
            <p className="text-gray-500 font-medium text-lg leading-relaxed italic">
              Cảm ơn bạn đã quan tâm hợp tác cùng <strong>Farmers Market</strong>.<br/>
              Hệ thống đã ghi nhận hồ sơ chào hàng của bạn. Bộ phận MD sẽ kiểm tra và phản hồi trực tiếp qua email/số điện thoại nếu sản phẩm phù hợp với định hướng kinh doanh hiện tại.
            </p>
          </div>
          <button onClick={resetForm} className="px-12 py-5 bg-[#1B4332] text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black transition-all">Quay lại Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans antialiased">
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="animate-bounce bg-emerald-600 p-5 rounded-[2rem] text-white shadow-2xl flex flex-col items-center gap-3">
             <Loader2 size={40} className="animate-spin" />
             <span className="text-[10px] font-black uppercase tracking-widest px-4">Đang xử lý Cloud...</span>
          </div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b border-emerald-50 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('supplier_dashboard')}>
          <div className="bg-emerald-600 w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg shadow-emerald-100"><Leaf size={22}/></div>
          <span className="font-black text-[#1B4332] text-xl tracking-tighter italic uppercase">Farmers Market</span>
        </div>
        {user && <button onClick={() => signOut(auth)} className="w-10 h-10 bg-gray-50 border border-emerald-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all shadow-inner"><LogOut size={20}/></button>}
      </nav>

      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {view === 'supplier_dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-[#1B4332] p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><Leaf size={150}/></div>
              <div className="relative z-10 text-center md:text-left">
                <h2 className="text-4xl font-black mb-2 uppercase italic tracking-tight leading-none">Xin chào!</h2>
                <p className="text-emerald-200">Chào mừng bạn nộp hồ sơ sản phẩm mới vào hệ thống Farmers Market.</p>
              </div>
              <button onClick={() => { setView('supplier_form'); setStep(1); }} className="relative z-10 bg-white text-[#1B4332] px-10 py-5 rounded-[2rem] font-black uppercase text-xs shadow-2xl hover:bg-emerald-50 transition-all">
                Chào hàng mới
              </button>
            </div>

            <div className="bg-white rounded-[3rem] shadow-xl border border-emerald-50 overflow-hidden">
              <div className="px-10 py-6 border-b border-emerald-50 bg-[#FDFBF7] font-black text-emerald-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                <History size={16}/> Lịch sử hồ sơ Cloud
              </div>
              <div className="divide-y divide-emerald-50">
                {submissions.filter(s => s.userId === user?.uid).length === 0 ? (
                  <div className="p-24 text-center text-gray-300 font-bold italic uppercase tracking-widest text-[10px] opacity-50">Hệ thống đang trống dữ liệu</div>
                ) : (
                  submissions.filter(s => s.userId === user?.uid).map(sub => (
                    <div key={sub.id} className="p-8 flex justify-between items-center hover:bg-emerald-50/10 transition-all group">
                      <div className="space-y-2 text-left">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Đang thẩm định</span>
                        </div>
                        <h4 className="text-2xl font-bold text-[#1B4332] uppercase tracking-tight">{sub.companyName}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                           Mã hồ sơ: #{sub.id.slice(-6).toUpperCase()} • Gửi ngày: {sub.createdAt ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : 'Vừa gửi'}
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
             <div className="mb-14 flex justify-between relative max-w-3xl mx-auto px-6">
                <div className="absolute top-5 left-12 right-12 h-1 bg-gray-100 -z-0 rounded-full"></div>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="z-10 flex flex-col items-center text-center">
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
                  <div className="space-y-12 animate-in fade-in">
                    <div className="space-y-8">
                       <h3 className="text-2xl font-black text-[#1B4332] flex items-center gap-3 tracking-tight uppercase italic border-b border-gray-50 pb-4"><Building2 size={32} className="text-emerald-600"/> Thông tin doanh nghiệp</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                         <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tên Công ty (GPKD) *</label>
                           <input type="text" placeholder="Công Ty TNHH..." className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold outline-none shadow-inner transition-all" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Mã số thuế *</label>
                           <input type="text" placeholder="Nhập MST" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold outline-none shadow-inner transition-all" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
                         </div>
                         <div className="md:col-span-2 space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Địa chỉ trụ sở chính *</label>
                           <input type="text" placeholder="Địa chỉ đăng ký kinh doanh..." className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold outline-none shadow-inner transition-all" value={formData.companyAddress} onChange={e => setFormData({...formData, companyAddress: e.target.value})} />
                         </div>
                       </div>
                    </div>

                    <div className="space-y-8 bg-emerald-50/40 p-8 rounded-[3rem] border border-emerald-50 shadow-inner">
                       <h3 className="text-xl font-black text-[#1B4332] flex items-center gap-3 tracking-tight uppercase italic"><User size={24} className="text-emerald-600"/> Thông tin người nộp hồ sơ</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                         <div className="space-y-1">
                           <label className="text-[10px] font-black text-[#1B4332] uppercase ml-1 flex items-center gap-2"><User size={12}/> Họ và tên *</label>
                           <input type="text" placeholder="Họ tên người liên hệ" className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 font-bold outline-none transition-all shadow-sm" value={formData.registrantName} onChange={e => setFormData({...formData, registrantName: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-black text-[#1B4332] uppercase ml-1 flex items-center gap-2"><Briefcase size={12}/> Chức vụ *</label>
                           <input type="text" placeholder="VD: Trưởng phòng Kinh doanh" className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 font-bold outline-none transition-all shadow-sm" value={formData.registrantPosition} onChange={e => setFormData({...formData, registrantPosition: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-black text-[#1B4332] uppercase ml-1 flex items-center gap-2"><Phone size={12}/> Số điện thoại Zalo *</label>
                           <input type="tel" placeholder="09xxx..." className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 font-bold outline-none transition-all shadow-sm" value={formData.registrantPhone} onChange={e => setFormData({...formData, registrantPhone: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-black text-[#1B4332] uppercase ml-1 flex items-center gap-2"><Mail size={12}/> Email liên hệ *</label>
                           <input type="email" placeholder="example@domain.com" className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 font-bold outline-none transition-all shadow-sm" value={formData.registrantEmail} onChange={e => setFormData({...formData, registrantEmail: e.target.value})} />
                         </div>
                       </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8 animate-in fade-in">
                    <h3 className="text-2xl font-black text-[#1B4332] flex items-center gap-3 tracking-tight uppercase italic"><FileText size={32} className="text-emerald-600"/> 2. Hồ sơ & Pháp lý</h3>
                    <div className="grid grid-cols-1 gap-5 text-left">
                      {[
                        { key: 'businessLicense', label: 'Giấy phép Kinh doanh / Giấy phép thành lập *' },
                        { key: 'safetyCert', label: 'Chứng nhận VSATTP / ISO / HACCP *' }
                      ].map(item => (
                        <div key={item.key} className="p-6 border-2 border-gray-50 rounded-[2.5rem] bg-gray-50/30 flex justify-between items-center group hover:bg-white hover:border-emerald-200 transition-all shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className="bg-emerald-50 p-3 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all"><FileText size={20}/></div>
                              <div>
                                <span className="font-black uppercase text-xs tracking-widest block">{item.label}</span>
                                {formData.legalDocs[item.key].name && <span className="text-[10px] font-bold text-emerald-600 italic">Đã chọn: {formData.legalDocs[item.key].name}</span>}
                              </div>
                           </div>
                           <label className="cursor-pointer px-6 py-3 bg-white border-2 border-gray-100 text-[10px] font-black uppercase rounded-2xl hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm">
                              <FileUp size={16}/> {formData.legalDocs[item.key].name ? 'Thay đổi file' : 'Tải file Scan'}
                              <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, item.key)} />
                           </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-8 animate-in fade-in">
                    <h3 className="text-2xl font-black text-[#1B4332] flex items-center gap-3 tracking-tight uppercase italic"><Clock size={32} className="text-emerald-600"/> 3. Điều kiện thương mại</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-emerald-50/20 p-10 rounded-[3.5rem] border border-emerald-50 shadow-inner text-left">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Thời hạn thanh toán công nợ (Ngày) *</label>
                        <select className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 font-bold outline-none shadow-sm" value={formData.creditTerm} onChange={e => setFormData({...formData, creditTerm: e.target.value})}>
                          <option value="15">15 ngày làm việc</option>
                          <option value="30">30 ngày làm việc (Chuẩn)</option>
                          <option value="45">45 ngày làm việc</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Lead-time Giao hàng (Giờ) *</label>
                        <select className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 font-bold outline-none shadow-sm" value={formData.leadTime} onChange={e => setFormData({...formData, leadTime: e.target.value})}>
                          <option value="12">Trong 12h (Hàng Tươi Sống)</option>
                          <option value="24">Trong 24h (Chuẩn)</option>
                          <option value="48">Trong 48h</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Giá trị đơn tối thiểu (MOQ) *</label>
                        <input type="text" placeholder="VD: 3 Triệu hoặc 10 Thùng" className="w-full p-4 bg-white border-2 border-emerald-100 rounded-2xl outline-none font-bold focus:border-emerald-500 transition-all shadow-sm" value={formData.moq} onChange={e => setFormData({...formData, moq: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Hình thức giao hàng *</label>
                        <div className="flex gap-4 p-1.5 bg-gray-50/50 rounded-2xl border-2 border-gray-100">
                          <button onClick={() => setFormData({...formData, deliveryType: 'Store'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${formData.deliveryType === 'Store' ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-lg' : 'bg-transparent text-gray-400 border-transparent'}`}>Giao Cửa Hàng</button>
                          <button onClick={() => setFormData({...formData, deliveryType: 'DC'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${formData.deliveryType === 'DC' ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-lg' : 'bg-transparent text-gray-400 border-transparent'}`}>Giao Tổng Kho</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* BƯỚC 4: HÀNG HÓA - Khắc phục triệt để lỗi */}
                {step === 4 && (
                  <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-between items-center border-b border-emerald-50 pb-6">
                      <h3 className="text-2xl font-black text-[#1B4332] flex items-center gap-3 uppercase italic leading-none"><Package size={32} className="text-emerald-600"/> 4. Danh mục sản phẩm</h3>
                      <button type="button" onClick={addProduct} className="bg-[#1B4332] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-xl"><Plus size={18}/> Thêm hàng</button>
                    </div>
                    <div className="space-y-10 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                      {formData.products.map((p, idx) => (
                        <div key={p.id} className="p-10 border-2 border-emerald-50 rounded-[4rem] bg-white relative hover:shadow-2xl transition-all border-l-[20px] border-l-emerald-600 shadow-lg text-left">
                          <div className="flex justify-between items-center mb-10">
                            <span className="bg-[#1B4332] text-white text-[11px] font-black px-6 py-2.5 rounded-full uppercase italic tracking-tighter shadow-md">Sản phẩm #{idx + 1}</span>
                            {formData.products.length > 1 && <button type="button" onClick={() => setFormData({...formData, products: formData.products.filter(item => item.id !== p.id)})} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={24}/></button>}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase">Tên sản phẩm đầy đủ *</label>
                               <input type="text" placeholder="Tên sản phẩm chi tiết..." className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold text-sm shadow-inner outline-none transition-all" value={p.name} onChange={e => updateProduct(p.id, 'name', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase">Ngành hàng *</label>
                               <select className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm shadow-inner transition-all" value={p.category} onChange={e => updateProduct(p.id, 'category', e.target.value)}>
                                 <option value="">Chọn ngành hàng</option>{ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase">Giá mua (Vốn nhập) *</label>
                               <input type="number" placeholder="VNĐ" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold text-sm shadow-inner outline-none transition-all" value={p.costPrice} onChange={e => updateProduct(p.id, 'costPrice', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase">Giá bán lẻ đề xuất *</label>
                               <input type="number" placeholder="VNĐ" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold text-sm shadow-inner outline-none transition-all" value={p.sellingPrice} onChange={e => updateProduct(p.id, 'sellingPrice', e.target.value)} />
                            </div>
                            <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center justify-between font-black text-emerald-800 uppercase tracking-tighter italic shadow-sm">
                              <span>LN Gộp dự kiến:</span>
                              <span className="text-2xl font-black">{p.costPrice && p.sellingPrice ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0}%</span>
                            </div>

                            <div className="md:col-span-3 space-y-1 border-t border-gray-50 pt-6 mt-2">
                               <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Đã từng cung ứng cho siêu thị nào? (Winmart, Lotte, Coop...)</label>
                               <input type="text" placeholder="Ghi tên các đối tác phân phối hiện tại (nếu có)" className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold text-sm outline-none shadow-inner transition-all" value={p.existingDistribution} onChange={e => updateProduct(p.id, 'existingDistribution', e.target.value)} />
                            </div>

                            <div className="md:col-span-3 grid grid-cols-2 gap-6 mt-4">
                               <div className="space-y-3">
                                  <label className="text-[10px] font-black text-[#1B4332] uppercase flex items-center gap-1.5"><FileText size={14}/> Hồ sơ công bố / VietGAP *</label>
                                  <label className="w-full py-8 border-2 border-dashed border-emerald-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-500 transition-all group shadow-sm bg-gray-50/20 text-center px-4">
                                     <FileUp size={28} className="text-emerald-200 group-hover:text-emerald-600 animate-pulse"/>
                                     <span className="text-[10px] font-black text-gray-400 mt-2 uppercase leading-tight group-hover:text-emerald-800">{p.complianceDoc || 'Chọn tệp PDF'}</span>
                                     <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'complianceDoc', p.id)} />
                                  </label>
                               </div>
                               <div className="space-y-3">
                                  <label className="text-[10px] font-black text-[#1B4332] uppercase flex items-center gap-1.5"><ImageIcon size={14}/> Hình ảnh sản phẩm *</label>
                                  <label className="w-full py-8 border-2 border-dashed border-emerald-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-500 transition-all group shadow-sm bg-gray-50/20 text-center px-4">
                                     <ImageIcon size={28} className="text-emerald-200 group-hover:text-emerald-600"/>
                                     <span className="text-[10px] font-black text-gray-400 mt-2 uppercase leading-tight group-hover:text-emerald-800">{p.productImage || 'Chọn Ảnh thực tế'}</span>
                                     <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'productImage', p.id)} />
                                  </label>
                               </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="text-center py-20 space-y-10 animate-in zoom-in-95">
                    <div className="w-32 h-32 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl relative border-4 border-white"><ShieldCheck size={70} className="relative z-10" /></div>
                    <h3 className="text-4xl font-black text-[#1B4332] tracking-tight uppercase italic leading-none">Xác nhận nộp hồ sơ<br/><span className="text-sm opacity-50 uppercase tracking-widest font-sans not-italic">Farmers Market Cloud Hub</span></h3>
                    <div className="max-w-md mx-auto p-8 bg-emerald-50/50 rounded-[3rem] border-2 border-dashed border-emerald-200 text-sm italic text-emerald-900 font-medium">
                       "Tôi cam đoan các thông tin công ty, người đại diện {formData.registrantName} và chi tiết sản phẩm là chính xác. Tôi chịu hoàn toàn trách nhiệm về tính pháp lý của toàn bộ hồ sơ nộp đi."
                    </div>
                  </div>
                )}

                <div className="mt-16 pt-12 border-t border-emerald-50 flex justify-between items-center">
                  <button type="button" onClick={handleBack} className={`font-black text-gray-300 hover:text-[#1B4332] uppercase text-[10px] tracking-widest transition-all ${step === 1 ? 'invisible' : 'flex items-center gap-1'}`}>
                    <ChevronLeft size={16}/> Quay lại
                  </button>
                  <div className="flex gap-4">
                    {step < 5 ? (
                      <button type="button" onClick={handleNext} className="bg-emerald-600 text-white px-14 py-5 rounded-[2rem] font-black shadow-xl hover:bg-emerald-700 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-emerald-900/20">Tiếp tục <ChevronRight size={16}/></button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={submitRegistration} 
                        disabled={loading} 
                        className="bg-[#1B4332] text-white px-16 py-6 rounded-[2rem] font-black shadow-2xl hover:bg-black transition-all flex items-center gap-3 uppercase text-xs italic tracking-widest shadow-emerald-200 disabled:opacity-50"
                      >
                        {loading ? "Đang đồng bộ..." : "Xác nhận gửi hồ sơ ngay"} <TrendingUp size={24}/>
                      </button>
                    )}
                  </div>
                </div>
             </form>
          </div>
        )}
      </main>
      <footer className="py-14 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] border-t border-emerald-50 bg-white italic opacity-70">
        © 2024 FARMERS MARKET • CLOUD HUB v5.4.5 • SRM INFRASTRUCTURE
      </footer>
    </div>
  );
};

export default App;
