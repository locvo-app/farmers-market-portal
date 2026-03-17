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
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Building2, FileText, Package, CheckCircle2, ChevronLeft, 
  AlertCircle, Plus, Eye, Search, LogIn, History, 
  TrendingUp, Leaf, Sprout, LogOut, Loader2, Info
} from 'lucide-react';

// --- 1. Cấu hình Trạng thái ---
const STATUS_CONFIG = {
  'NOP_HO_SO': { label: 'Hồ sơ mới', color: 'bg-gray-100 text-gray-600', icon: <History size={14}/> },
  'DANG_THAM_DINH': { label: 'Đang thẩm định', color: 'bg-emerald-100 text-emerald-600', icon: <Search size={14}/> },
  'DA_DUYET': { label: 'Đối tác chính thức', color: 'bg-green-600 text-white', icon: <CheckCircle2 size={14}/> },
};

// --- 2. Cấu hình Firebase của Thanh Lộc ---
const firebaseConfig = {
  apiKey: "AIzaSyDl0PXFoLm5pv5m8aNHW6VLwrxDs0byzCA",
  authDomain: "farmers-market-portal.firebaseapp.com",
  projectId: "farmers-market-portal",
  storageBucket: "farmers-market-portal.firebasestorage.app",
  messagingSenderId: "875336592790",
  appId: "1:875336592790:web:de4f61278891270c73c1b7",
  measurementId: "G-KGNM9B7EEG"
};

// Khởi tạo ứng dụng
const appId = 'farmers-market-v2';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Linh kiện hiển thị nhãn trạng thái
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
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [formData, setFormData] = useState({ companyName: '', taxId: '' });

  // Theo dõi trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && view === 'login') setView('supplier_dashboard');
    });
    return () => unsubscribe();
  }, [view]);

  // Lấy dữ liệu từ Cloud Firestore
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'submissions');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubmissions(docs);
    }, (err) => {
      console.error("Lỗi Firestore:", err);
      if (err.code === 'permission-denied') {
        setErrorMsg("Lỗi quyền truy cập: Bạn cần vào Firestore > Rules và bật chế độ Test Mode.");
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Xử lý Đăng nhập Google
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Lỗi Login:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg("Tên miền này chưa được cấp phép. Hãy thêm 'usercontent.goog' hoặc link Vercel của bạn vào Authorized Domains trong Firebase.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg("Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.");
      } else {
        setErrorMsg("Lỗi: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Xử lý Gửi hồ sơ
  const submitRegistration = async () => {
    if (!user) return;
    if (!formData.companyName || !formData.taxId) {
      setErrorMsg("Vui lòng điền đầy đủ Tên công ty và Mã số thuế.");
      return;
    }
    
    setLoading(true);
    setErrorMsg(null);
    
    try {
      const data = {
        companyName: formData.companyName,
        taxId: formData.taxId,
        userId: user.uid,
        userEmail: user.email,
        status: 'NOP_HO_SO',
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'submissions'), data);
      setFormData({ companyName: '', taxId: '' });
      setView('supplier_dashboard');
      
    } catch (err) { 
      console.error("Lỗi gửi bài:", err);
      setErrorMsg("Không thể gửi hồ sơ. Hãy kiểm tra Firestore Database đã được tạo chưa.");
    } finally { 
      setLoading(false); 
    }
  };

  // Trang Đăng nhập
  if (!user && view === 'login') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl border border-emerald-50">
           <div className="w-24 h-24 bg-emerald-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3">
             <Leaf size={48} />
           </div>
           <h1 className="text-3xl font-black text-[#1B4332] mb-10 uppercase tracking-tight">Cổng Chào Hàng</h1>
           <button 
             onClick={handleGoogleSignIn} 
             disabled={loading}
             className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 flex items-center justify-center gap-3 transition-all mb-4 disabled:opacity-50"
           >
             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
             {loading ? "Đang xử lý..." : "Tiếp tục với Google"}
           </button>
           {errorMsg && (
             <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold leading-relaxed">
               {errorMsg}
             </div>
           )}
        </div>
      </div>
    );
  }

  // Trang chính sau khi đăng nhập
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans antialiased">
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="bg-emerald-600 p-5 rounded-[2rem] text-white shadow-2xl flex flex-col items-center gap-3">
            <Loader2 size={40} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Đang tải...</span>
          </div>
        </div>
      )}

      {errorMsg && view !== 'login' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
           <AlertCircle size={20} />
           <span className="text-xs font-bold">{errorMsg}</span>
           <button onClick={() => setErrorMsg(null)} className="font-black">✕</button>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b border-emerald-50 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('supplier_dashboard')}>
          <div className="bg-emerald-600 w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg"><Leaf size={22}/></div>
          <span className="font-black text-[#1B4332] text-xl tracking-tighter">Farmers Market</span>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-emerald-800 hidden sm:block">{user.email}</span>
            <button onClick={() => signOut(auth)} className="w-10 h-10 bg-gray-50 border border-emerald-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">
              <LogOut size={20}/>
            </button>
          </div>
        )}
      </nav>

      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {view === 'supplier_dashboard' ? (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-[#1B4332] p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-4xl font-black mb-2 uppercase italic tracking-tight">Chào Đối Tác!</h2>
                <p className="text-emerald-200">Bắt đầu gửi hồ sơ và theo dõi tiến độ phê duyệt.</p>
              </div>
              <button onClick={() => setView('supplier_form')} className="relative z-10 bg-white text-[#1B4332] px-10 py-5 rounded-[2rem] font-black uppercase text-xs shadow-2xl hover:bg-emerald-50">Chào hàng mới</button>
            </div>

            <div className="bg-white rounded-[3rem] shadow-xl border border-emerald-50 overflow-hidden">
              <div className="px-10 py-6 border-b border-emerald-50 bg-[#FDFBF7] font-black text-emerald-800 uppercase text-xs">Hồ sơ của bạn</div>
              <div className="divide-y divide-emerald-50">
                {submissions.filter(s => s.userId === user?.uid).length === 0 ? (
                  <div className="p-24 text-center text-gray-300 font-bold italic uppercase tracking-widest text-[10px]">Chưa có dữ liệu nào được lưu</div>
                ) : (
                  submissions.filter(s => s.userId === user?.uid).map(sub => (
                    <div key={sub.id} className="p-8 flex justify-between items-center hover:bg-emerald-50/5 transition-all">
                      <div className="space-y-2">
                        <StatusBadge status={sub.status} />
                        <h4 className="text-2xl font-bold text-[#1B4332] uppercase tracking-tight">{sub.companyName}</h4>
                        <p className="text-[9px] text-gray-400 font-bold">Gửi ngày: {sub.createdAt ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : 'Mới'}</p>
                      </div>
                      <button className="w-14 h-14 bg-[#F0F5F2] text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Eye size={24}/></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-emerald-50 animate-in slide-in-from-bottom-4">
            <button onClick={() => setView('supplier_dashboard')} className="mb-8 font-bold text-gray-400 uppercase text-[10px] flex items-center gap-2 hover:text-emerald-700 transition-all"><ChevronLeft size={16}/> Quay lại</button>
            <h2 className="text-3xl font-black text-[#1B4332] mb-10 uppercase italic border-b border-emerald-50 pb-6">Phiếu đăng ký sản phẩm</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tên Công ty chính thức *</label>
                <input type="text" placeholder="Nhập tên công ty" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold outline-none transition-all shadow-inner" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Mã số thuế *</label>
                <input type="text" placeholder="Nhập mã số thuế" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 font-bold outline-none transition-all shadow-inner" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
              </div>
            </div>
            <div className="bg-emerald-50 p-6 rounded-2xl mb-10 flex items-start gap-4 border border-emerald-100">
               <Info className="text-emerald-600 shrink-0" size={20}/>
               <p className="text-xs text-emerald-900 leading-relaxed font-medium">Bằng việc nhấn gửi, bạn cam đoan các thông tin cung cấp là chính xác. Bộ phận MD sẽ kiểm tra và phản hồi qua email <strong>{user.email}</strong>.</p>
            </div>
            <button onClick={submitRegistration} disabled={loading} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              {loading ? "Đang xử lý..." : "Xác nhận gửi hồ sơ"} <TrendingUp size={24}/>
            </button>
          </div>
        )}
      </main>
      <footer className="py-14 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">© 2024 FARMERS MARKET PORTAL</footer>
    </div>
  );
};

export default App;
