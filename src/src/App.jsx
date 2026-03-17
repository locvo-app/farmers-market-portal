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
};

const ALL_CATEGORIES = Object.values(MD_STRUCTURE).flatMap(md => md.categories);

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

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans antialiased">
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="animate-bounce bg-emerald-600 p-5 rounded-[2rem] text-white shadow-2xl">
            <Sprout size={40} className="animate-pulse" />
          </div>
        </div>
      )}

      {authError && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center">
             <AlertCircle className="mx-auto text-red-500 mb-4" size={48}/>
             <h3 className="text-xl font-bold mb-2">Lỗi tên miền</h3>
             <p className="text-sm text-gray-600 mb-6">Vui lòng thêm tên miền này vào Firebase Console {'>'} Authentication {'>'} Settings.</p>
             <button onClick={() => setAuthError(null)} className="w-full py-3 bg-[#1B4332] text-white rounded-xl font-bold">Đóng</button>
          </div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b border-emerald-50 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('supplier_dashboard')}>
          <div className="bg-emerald-600 w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg"><Leaf size={22}/></div>
          <div>
            <span className="font-black text-[#1B4332] text-xl tracking-tighter block leading-none">Farmers Market</span>
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Portal</span>
          </div>
        </div>
        {user && (
          <button onClick={() => signOut(auth)} className="w-10 h-10 bg-gray-50 border border-emerald-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><LogOut size={20}/></button>
        )}
      </nav>

      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl text-center border border-emerald-50">
               <div className="w-24 h-24 bg-emerald-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3"><Leaf size={48} /></div>
               <h1 className="text-3xl font-black text-[#1B4332] mb-10 uppercase tracking-tight">Đối Tác Đăng Nhập</h1>
               <button onClick={handleGoogleSignIn} className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 flex items-center justify-center gap-3 transition-all">
                 <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
                 Tiếp tục với Google
               </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-[#1B4332] p-12 rounded-[3.5rem] text-white flex justify-between items-center shadow-2xl">
              <div>
                <h2 className="text-4xl font-black tracking-tight mb-2 uppercase italic">Chào {user.email}!</h2>
                <p className="text-emerald-200">Bắt đầu chào hàng nông sản sạch tại đây.</p>
              </div>
              <button onClick={() => setView('supplier_form')} className="bg-white text-[#1B4332] px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl">
                Chào hàng mới
              </button>
            </div>
            
            {view === 'supplier_dashboard' && (
              <div className="bg-white rounded-[3rem] shadow-xl border border-emerald-50 overflow-hidden">
                <div className="px-10 py-6 border-b border-emerald-50 bg-[#FDFBF7] font-black text-emerald-800 uppercase tracking-widest text-xs">Danh sách hồ sơ của bạn</div>
                <div className="divide-y divide-emerald-50">
                  {submissions.filter(s => s.userId === user?.uid).map(sub => (
                    <div key={sub.id} className="p-8 flex justify-between items-center group">
                      <div className="space-y-2">
                        <StatusBadge status={sub.status} />
                        <h4 className="text-2xl font-bold text-[#1B4332]">{sub.companyName}</h4>
                      </div>
                      <button className="w-14 h-14 bg-[#F0F5F2] text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><Eye size={24}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'supplier_form' && (
               <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-emerald-50">
                  <button onClick={() => setView('supplier_dashboard')} className="mb-8 font-bold text-gray-400 uppercase text-[10px] tracking-widest hover:text-emerald-700 flex items-center gap-2"><ChevronLeft size={16}/> Quay lại</button>
                  <h3 className="text-3xl font-black text-[#1B4332] mb-10">Phiếu đăng ký sản phẩm</h3>
                  <div className="grid grid-cols-2 gap-8 mb-10">
                    <input type="text" placeholder="Tên Công ty *" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                    <input type="text" placeholder="Mã số thuế *" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
                  </div>
                  <button onClick={submitRegistration} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase shadow-2xl hover:bg-emerald-700 transition-all">Gửi hồ sơ chào hàng</button>
               </div>
            )}
          </div>
        )}
      </main>
      <footer className="py-10 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">© 2024 FARMERS MARKET PORTAL</footer>
    </div>
  );
};

export default App;
