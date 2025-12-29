import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  Archive, 
  History, 
  LayoutDashboard,
  Calendar,
  Info,
  ChevronLeft,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Cloud,
  Check,
  RefreshCw,
  Download
} from 'lucide-react';

// Firebase 설정 및 초기화
// 사용자 환경에서 제공하는 설정값을 자동으로 불러오도록 수정했습니다.
const firebaseConfig = JSON.parse(__firebase_config);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cleaning-manager-v6';

const INITIAL_DATA = {
  안방: [
    { id: 1, text: "안방 보드게임장 정리", completed: false },
    { id: 2, text: "안방 침대 및 청소", completed: false },
    { id: 3, text: "안방 침대 위 청소", completed: false },
    { id: 4, text: "안방 책장 정리", completed: false },
    { id: 5, text: "안방 옷장 정리", completed: false },
  ],
  드레스룸: [
    { id: 6, text: "옷 정리", completed: false },
    { id: 7, text: "화장대 정리", completed: false },
  ],
  거실: [
    { id: 8, text: "거실장 정리", completed: false },
    { id: 9, text: "회전책장", completed: false },
    { id: 10, text: "쇼파 옆 수납함", completed: false },
    { id: 11, text: "책상", completed: false },
  ],
  서재방: [
    { id: 12, text: "컴퓨터책상", completed: false },
    { id: 13, text: "책장", completed: false },
    { id: 14, text: "책장옆 수납함", completed: false },
    { id: 15, text: "책상 옆 책꽂이", completed: false },
    { id: 16, text: "책상 옆 트롤리", completed: false },
  ],
  애들방: [
    { id: 17, text: "애들책상", completed: false },
    { id: 18, text: "장난감 수납함", completed: false },
    { id: 19, text: "옷걸이", completed: false },
    { id: 20, text: "옷장", completed: false },
    { id: 21, text: "책상 및 수납", completed: false },
  ],
  주방: [
    { id: 22, text: "식탁 위 수납", completed: false },
    { id: 23, text: "싱크대 위", completed: false },
    { id: 24, text: "싱크대 수납", completed: false },
    { id: 25, text: "오븐 장 1,2,3,4", completed: false },
    { id: 26, text: "냉장고장1,2", completed: false },
    { id: 27, text: "아일랜드장", completed: false },
    { id: 28, text: "다용도실", completed: false },
  ],
  "복도,창고": [
    { id: 29, text: "복도 책장", completed: false },
    { id: 30, text: "신발장", completed: false },
    { id: 31, text: "신발장 앞 창고", completed: false },
    { id: 32, text: "복도 책장 앞 창고", completed: false },
  ],
  욕실: [
    { id: 33, text: "안방 욕실", completed: false },
    { id: 34, text: "거실 욕실", completed: false },
  ],
  알파룸: [
    { id: 35, text: "알파룸 책장", completed: false },
    { id: 36, text: "알파룸 책상", completed: false },
    { id: 37, text: "남편 옷 정리", completed: false },
  ]
};

export default function App() {
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState(INITIAL_DATA);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [newTask, setNewTask] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("주방");
  const [showHistory, setShowHistory] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("인증 실패", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('서비스 워커 등록 완료'))
          .catch(err => console.log('서비스 워커 등록 실패', err));
      });
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'currentTasks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCategories(docSnap.data().categories);
        } else {
          await setDoc(docRef, { categories: INITIAL_DATA });
          setCategories(INITIAL_DATA);
        }

        const historyCol = collection(db, 'artifacts', appId, 'users', user.uid, 'history');
        const historySnap = await getDocs(historyCol);
        const historyList = historySnap.docs.map(d => d.data());
        historyList.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(historyList);
      } catch (err) {
        console.error("데이터 로드 실패", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const saveToCloud = async (newCategories) => {
    if (!user) return;
    setSyncing(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'currentTasks');
      await setDoc(docRef, { categories: newCategories, lastUpdated: Date.now() });
    } catch (err) {
      console.error("클라우드 저장 실패", err);
    } finally {
      setTimeout(() => setSyncing(false), 500);
    }
  };

  const calculateProgress = (taskList) => {
    if (!taskList || taskList.length === 0) return 0;
    const completed = taskList.filter(t => t.completed).length;
    return Math.round((completed / taskList.length) * 100);
  };

  const totalTasks = Object.values(categories).flat();
  const overallProgress = calculateProgress(totalTasks);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const toggleTask = (category, id) => {
    const updated = {
      ...categories,
      [category]: categories[category].map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    };
    setCategories(updated);
    saveToCloud(updated);
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const newTaskObj = { id: Date.now(), text: newTask, completed: false };
    const updated = {
      ...categories,
      [selectedCategory]: [...categories[selectedCategory], newTaskObj]
    };
    setCategories(updated);
    saveToCloud(updated);
    setNewTask("");
    showToast("새 항목이 추가되었습니다.");
  };

  const deleteTask = (category, id) => {
    const updated = {
      ...categories,
      [category]: categories[category].filter(task => task.id !== id)
    };
    setCategories(updated);
    saveToCloud(updated);
    showToast("항목이 삭제되었습니다.");
  };

  const archiveCurrentSession = async () => {
    if (!user) return;
    const now = new Date();
    const dateLabel = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}월`;
    const timestamp = Date.now();
    
    const newEntry = {
      date: dateLabel,
      timestamp: timestamp,
      data: JSON.parse(JSON.stringify(categories)),
      progress: overallProgress
    };

    try {
      const historyDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'history', dateLabel);
      await setDoc(historyDocRef, newEntry);

      setHistory(prev => {
        const existingIndex = prev.findIndex(item => item.date === dateLabel);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = newEntry;
          return updated;
        }
        return [newEntry, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      });
      
      showToast(`${dateLabel} 기록이 서버에 백업되었습니다.`);
    } catch (err) {
      console.error("백업 실패", err);
    }
  };

  const deleteHistoryItem = async (timestamp, dateLabel) => {
    if (!user) return;
    try {
      const historyDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'history', dateLabel);
      await deleteDoc(historyDocRef);
      setHistory(prev => prev.filter(item => item.timestamp !== timestamp));
      showToast("기록이 삭제되었습니다.");
    } catch (err) {
      console.error("기록 삭제 실패", err);
    }
  };

  const confirmReset = () => {
    const reset = {};
    Object.keys(categories).forEach(cat => {
      reset[cat] = categories[cat].map(t => ({ ...t, completed: false }));
    });
    setCategories(reset);
    saveToCloud(reset);
    setIsResetModalOpen(false);
    showToast("진행 상황이 초기화되었습니다.");
  };

  const toggleHistoryDetail = (id) => {
    setExpandedHistoryId(expandedHistoryId === id ? null : id);
  };

  const handleInstall = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="text-indigo-600 animate-spin" size={48} />
        <p className="text-slate-500 font-bold animate-pulse">데이터를 동기화 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsResetModalOpen(false)} />
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 text-center">
            <div className="bg-amber-50 p-5 rounded-full border border-amber-100 inline-block mb-4">
              <AlertCircle size={40} className="text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">체크를 모두 해제할까요?</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">리스트 구성은 그대로 유지됩니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">닫기</button>
              <button onClick={confirmReset} className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg">확인</button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-6 shadow-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-indigo-600 tracking-tight">우리집 대청소</h1>
                <div className="flex items-center">
                  {syncing ? (
                    <RefreshCw size={18} className="text-indigo-400 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <Cloud size={14} className="text-emerald-500" />
                      <Check size={10} className="text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">클라우드 동기화 중</p>
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              {deferredPrompt && (
                <button 
                  onClick={handleInstall}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black border border-indigo-100 hover:bg-indigo-100 transition-all flex-1 sm:flex-none"
                >
                  <Download size={14} /> 앱 설치
                </button>
              )}
              <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-100 flex items-center gap-3 flex-1 sm:flex-none">
                <div className="w-16 sm:w-24 h-2 bg-white rounded-full overflow-hidden border border-slate-100">
                  <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
                </div>
                <span className="text-xl font-black text-indigo-600 tabular-nums">{overallProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-8 space-y-6">
        <div className="flex justify-between items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-sm ${
              showHistory ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showHistory ? <ChevronLeft size={18} /> : <History size={18} />}
            {showHistory ? '현황 리스트' : '백업 내역'}
          </button>

          {!showHistory && (
            <div className="flex gap-2">
              <button onClick={() => setIsResetModalOpen(true)} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all shadow-sm" title="체크 초기화">
                <RotateCcw size={20} />
              </button>
              <button onClick={archiveCurrentSession} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 shadow-lg active:scale-95">
                <Archive size={18} />
                백업하기
              </button>
            </div>
          )}
        </div>

        {showHistory ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {history.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center">
                <Info size={36} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">기록이 없습니다.</p>
              </div>
            ) : (
              history.map((record) => {
                const isExpanded = expandedHistoryId === record.timestamp;
                return (
                  <div key={record.timestamp} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <span className="text-xl font-black text-slate-800 tracking-tight">{record.date} 기록</span>
                        <button onClick={() => deleteHistoryItem(record.timestamp, record.date)} className="text-slate-200 hover:text-red-500 p-2 transition-colors">
                          <Trash2 size={22} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 text-center">
                        <div className="col-span-2 sm:col-span-1 bg-indigo-600 p-4 rounded-2xl shadow-lg">
                          <span className="text-white text-[10px] font-black opacity-70 block mb-1 uppercase tracking-tighter">진행률</span>
                          <span className="text-white text-2xl font-black tabular-nums">{record.progress}%</span>
                        </div>
                        {Object.keys(record.data).slice(0, 3).map(cat => (
                          <div key={cat} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-slate-400 text-[9px] font-black block truncate mb-1 uppercase tracking-tighter">{cat}</span>
                            <span className="text-slate-700 text-base font-black tabular-nums">{calculateProgress(record.data[cat])}%</span>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => toggleHistoryDetail(record.timestamp)}
                        className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black transition-all border ${
                          isExpanded ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-indigo-600 border-indigo-50 hover:bg-indigo-50'
                        }`}
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        {isExpanded ? '상세 정보 닫기' : '상세 보기'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-8 animate-in slide-in-from-top-4 duration-300">
                        {Object.entries(record.data).map(([category, items]) => (
                          <div key={category}>
                            <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 px-1">
                              <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                              {category}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {items.map(item => (
                                <div key={item.id} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/50 shadow-sm">
                                  {item.completed ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> : <Circle size={18} className="text-slate-200 shrink-0" />}
                                  <span className={`text-sm truncate font-bold ${item.completed ? 'text-slate-300 italic' : 'text-slate-600'}`}>
                                    {item.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <>
            <form onSubmit={addTask} className="bg-white p-6 rounded-[2.5rem] border-2 border-indigo-50 shadow-sm flex flex-col sm:flex-row gap-3">
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)} 
                className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-slate-700"
              >
                {Object.keys(categories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <div className="flex-1 flex gap-2">
                <input 
                  type="text" 
                  value={newTask} 
                  onChange={(e) => setNewTask(e.target.value)} 
                  placeholder="새 항목 입력..." 
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300" 
                />
                <button type="submit" className="bg-indigo-600 text-white px-5 rounded-2xl hover:bg-indigo-700 shadow-lg active:scale-95 transition-all">
                  <Plus size={24} strokeWidth={3} />
                </button>
              </div>
            </form>

            <div className="space-y-10">
              {Object.entries(categories).map(([category, tasks]) => {
                const progress = calculateProgress(tasks);
                return (
                  <section key={category} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-4 px-2">
                        <div className={`w-2.5 h-8 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">{category}</h3>
                      </div>
                      <div className="bg-white px-5 py-2 rounded-2xl border border-slate-200 shadow-sm">
                        <span className={`text-sm font-black tabular-nums ${progress === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{progress}%</span>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-50 p-2">
                      {tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className="group flex items-center justify-between p-5 hover:bg-indigo-50/30 rounded-2xl cursor-pointer transition-all mx-1" 
                          onClick={() => toggleTask(category, task.id)}
                        >
                          <div className="flex items-center gap-5 flex-1 min-w-0">
                            <div className="shrink-0 transition-transform active:scale-90 duration-200">
                              {task.completed ? <CheckCircle2 className="text-emerald-500" size={30} /> : <Circle className="text-slate-100 group-hover:text-indigo-200" size={30} strokeWidth={1.5} />}
                            </div>
                            <span className={`text-base sm:text-lg truncate transition-all duration-300 ${task.completed ? 'line-through text-slate-300 font-bold italic' : 'text-slate-700 font-bold'}`}>
                              {task.text}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteTask(category, task.id); }} 
                            className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 p-2 transition-all hover:bg-red-50 rounded-xl ml-2"
                          >
                            <Trash2 size={22} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-4 mt-20 text-center border-t border-slate-200 pt-10 pb-6">
        <p className="text-slate-400 text-xs font-bold leading-loose max-w-sm mx-auto">
          브라우저 메뉴에서 홈 화면에 추가를 눌러 설치해 보세요.
        </p>
      </footer>
    </div>
  );
}