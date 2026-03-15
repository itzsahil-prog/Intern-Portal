import React, { useState, useEffect, Component } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  Link, 
  useNavigate 
} from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Task, Application, Doubt } from './types';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  MessageSquare, 
  FileText, 
  LogOut, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Send,
  ExternalLink,
  Menu,
  X,
  Briefcase,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.error.includes('insufficient permissions')) {
          message = "You don't have permission to view this data. Please contact an administrator.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <AlertCircle size={48} className="mb-4 text-red-500" />
          <h2 className="mb-2 text-xl font-bold">Application Error</h2>
          <p className="mb-6 text-zinc-500 max-w-md">{message}</p>
          <Button onClick={() => window.location.reload()}>Reload Application</Button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-black text-white hover:bg-zinc-800',
      secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
      outline: 'border border-zinc-200 bg-transparent hover:bg-zinc-50',
      ghost: 'bg-transparent hover:bg-zinc-100',
      danger: 'bg-red-500 text-white hover:bg-red-600',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:opacity-50',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn('rounded-xl border border-zinc-200 bg-white p-6 shadow-sm', className)}
    {...props}
  >
    {children}
  </div>
);

// --- Google Drive Integration (Mock/Structured) ---

const GoogleDriveSettings = () => {
  const [connected, setConnected] = useState(false);

  const handleConnect = () => {
    // In a real app, this would trigger OAuth
    // For now, we simulate the connection
    setConnected(true);
    alert('Connecting to veloxcodeagency@gmail.com Google Drive...');
  };

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <ExternalLink size={20} />
          </div>
          <div>
            <h3 className="font-bold">Google Drive Storage</h3>
            <p className="text-sm text-zinc-500">
              {connected ? 'Connected to veloxcodeagency@gmail.com' : 'Not connected'}
            </p>
          </div>
        </div>
        <Button variant={connected ? 'outline' : 'primary'} onClick={handleConnect}>
          {connected ? 'Disconnect' : 'Connect Drive'}
        </Button>
      </div>
    </Card>
  );
};

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' }) => {
  const variants = {
    default: 'bg-zinc-100 text-zinc-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant])}>
      {children}
    </span>
  );
};

// --- Views ---

const LoginPage = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Create default profile (intern by default, unless it's the admin email)
        const isAdmin = user.email === 'itzsahilg1@gmail.com';
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: user.displayName || 'Anonymous',
          email: user.email || '',
          role: isAdmin ? 'admin' : 'intern',
          status: 'active',
          joiningDate: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request') {
        console.error('Login error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white shadow-xl">
            <Briefcase size={32} />
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Velox Intern Portal</h1>
          <p className="mt-2 text-zinc-600">Manage your internship journey with Velox Code Agency</p>
        </div>
        <Card className="space-y-4">
          <p className="text-sm text-zinc-500">Sign in to access your dashboard</p>
          <Button onClick={handleLogin} className="w-full py-6 text-lg" variant="primary" disabled={loading}>
            <img src="https://www.google.com/favicon.ico" className="mr-2 h-5 w-5" alt="Google" />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Button>
        </Card>
        <div className="text-sm text-zinc-400">
          <Link to="/apply" className="hover:text-black hover:underline">Want to join us? Apply here</Link>
        </div>
      </motion.div>
    </div>
  );
};

const PublicApplicationPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', whatsapp: '', resumeUrl: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'applications'), {
        ...formData,
        status: 'pending',
        appliedAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Application error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <Card className="max-w-md text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h2 className="text-2xl font-bold">Application Submitted!</h2>
          <p className="mt-2 text-zinc-600">We've received your application. Our team will review it and get back to you soon.</p>
          <Button onClick={() => window.location.href = '/'} className="mt-6 w-full">Back to Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Apply for Internship</h1>
          <p className="text-zinc-600">Join Velox Code Agency and build the future with us.</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Full Name</label>
              <input 
                required
                type="text" 
                className="mt-1 w-full rounded-lg border border-zinc-200 p-2 focus:border-black focus:outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Email Address</label>
              <input 
                required
                type="email" 
                className="mt-1 w-full rounded-lg border border-zinc-200 p-2 focus:border-black focus:outline-none"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">WhatsApp Number</label>
              <input 
                required
                type="tel" 
                className="mt-1 w-full rounded-lg border border-zinc-200 p-2 focus:border-black focus:outline-none"
                value={formData.whatsapp}
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Resume Link (Google Drive/Dropbox)</label>
              <input 
                required
                type="url" 
                className="mt-1 w-full rounded-lg border border-zinc-200 p-2 focus:border-black focus:outline-none"
                value={formData.resumeUrl}
                onChange={e => setFormData({...formData, resumeUrl: e.target.value})}
              />
            </div>
            <Button type="submit" className="w-full py-4" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

// --- Main App Layout ---

const Sidebar = ({ role, onClose }: { role: string; onClose?: () => void }) => {
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
    { to: '/doubts', icon: MessageSquare, label: 'Doubts' },
  ];

  if (role === 'admin') {
    links.push(
      { to: '/interns', icon: Users, label: 'Interns' },
      { to: '/applications', icon: FileText, label: 'Applications' }
    );
  }

  return (
    <div className="flex h-full flex-col bg-black text-white">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
            <Briefcase size={20} />
          </div>
          <span className="text-xl font-bold">Velox</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {links.map(link => (
          <Link 
            key={link.to} 
            to={link.to} 
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            <link.icon size={20} />
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-zinc-400 hover:bg-zinc-900 hover:text-white"
          onClick={() => signOut(auth)}
        >
          <LogOut size={20} className="mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
};

const Dashboard = ({ profile }: { profile: UserProfile }) => {
  const [stats, setStats] = useState({ tasks: 0, doubts: 0, interns: 0 });

  useEffect(() => {
    // Simple stats fetch
    const qTasks = query(collection(db, 'tasks'), where('assignedTo', '==', profile.uid));
    const unsubscribeTasks = onSnapshot(qTasks, s => setStats(prev => ({ ...prev, tasks: s.size })), (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));
    
    const qDoubts = query(collection(db, 'doubts'), where('internId', '==', profile.uid));
    const unsubscribeDoubts = onSnapshot(qDoubts, s => setStats(prev => ({ ...prev, doubts: s.size })), (err) => handleFirestoreError(err, OperationType.LIST, 'doubts'));

    return () => {
      unsubscribeTasks();
      unsubscribeDoubts();
    };
  }, [profile.uid]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Welcome back, {profile.name}</h1>
        <p className="text-zinc-500">Here's what's happening today.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500">My Tasks</p>
            <p className="text-2xl font-bold">{stats.tasks}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Open Doubts</p>
            <p className="text-2xl font-bold">{stats.doubts}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Status</p>
            <p className="text-lg font-bold capitalize">{profile.status}</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-bold">Recent Tasks</h3>
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">No recent tasks found.</p>
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 font-bold">Announcements</h3>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-sm font-medium">Welcome to the new portal!</p>
            <p className="mt-1 text-xs text-zinc-500">All interns are requested to update their profiles.</p>
          </div>
        </Card>
      </div>

      {profile.role === 'admin' && <GoogleDriveSettings />}
    </div>
  );
};

const TasksPage = ({ profile }: { profile: UserProfile }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', deadline: '', assignedTo: '' });
  const [interns, setInterns] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = profile.role === 'admin' 
      ? query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'tasks'), where('assignedTo', '==', profile.uid), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, s => {
      setTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    if (profile.role === 'admin') {
      const qInterns = query(collection(db, 'users'), where('role', '==', 'intern'));
      onSnapshot(qInterns, s => setInterns(s.docs.map(d => d.data() as UserProfile)), (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    }

    return unsubscribe;
  }, [profile.uid, profile.role]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        assignedByName: profile.name,
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString(),
      });
      setShowAddModal(false);
      setNewTask({ title: '', description: '', deadline: '', assignedTo: '' });
    } catch (error) {
      console.error('Add task error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {profile.role === 'admin' && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={18} className="mr-2" />
            Assign Task
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {tasks.map(task => (
          <motion.div
            key={task.id}
            layout
            initial={false}
            animate={{
              scale: task.status === 'completed' ? [1, 1.01, 1] : 1,
              opacity: task.status === 'completed' ? 0.8 : 1,
            }}
            transition={{ duration: 0.4 }}
          >
            <Card className={cn(
              "flex flex-col justify-between gap-4 md:flex-row md:items-center transition-colors duration-500",
              task.status === 'completed' ? "bg-emerald-50/30 border-emerald-100" : "bg-white"
            )}>
              <div className={cn(
                "transition-all duration-500",
                task.status === 'completed' && "opacity-60"
              )}>
                <h3 className={cn(
                  "font-bold transition-all duration-500",
                  task.status === 'completed' && "line-through text-zinc-400"
                )}>
                  {task.title}
                </h3>
                <p className="text-sm text-zinc-500">{task.description}</p>
                
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      className={cn(
                        "h-full transition-all duration-500",
                        task.progress === 100 ? "bg-emerald-500" : "bg-blue-500"
                      )}
                    />
                  </div>
                  {profile.role === 'intern' && task.status !== 'completed' && (
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={task.progress}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        updateDoc(doc(db, 'tasks', task.id), { 
                          progress: val,
                          status: val === 100 ? 'completed' : val > 0 ? 'in-progress' : 'pending'
                        });
                      }}
                      className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-blue-600"
                    />
                  )}
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    Deadline: {new Date(task.deadline).toLocaleDateString()}
                  </span>
                  {profile.role === 'admin' && (
                    <span>Assigned to: {interns.find(i => i.uid === task.assignedTo)?.name || 'Unknown'}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in-progress' ? 'warning' : 'default'}>
                  {task.status}
                </Badge>
                {profile.role === 'intern' && task.status !== 'completed' && (
                  <Button size="sm" variant="outline" onClick={() => updateDoc(doc(db, 'tasks', task.id), { status: 'completed' })}>
                    Mark Complete
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
        {tasks.length === 0 && <p className="py-12 text-center text-zinc-500">No tasks found.</p>}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Assign New Task</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                  <X size={20} />
                </Button>
              </div>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <input required className="mt-1 w-full rounded-lg border p-2" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea required className="mt-1 w-full rounded-lg border p-2" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium">Deadline</label>
                  <input required type="date" className="mt-1 w-full rounded-lg border p-2" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium">Assign To</label>
                  <select required className="mt-1 w-full rounded-lg border p-2" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                    <option value="">Select Intern</option>
                    {interns.map(i => <option key={i.uid} value={i.uid}>{i.name}</option>)}
                  </select>
                </div>
                <Button type="submit" className="w-full">Create Task</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DoubtsPage = ({ profile }: { profile: UserProfile }) => {
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [newDoubt, setNewDoubt] = useState('');

  useEffect(() => {
    const q = profile.role === 'admin'
      ? query(collection(db, 'doubts'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'doubts'), where('internId', '==', profile.uid), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, s => {
      setDoubts(s.docs.map(d => ({ id: d.id, ...d.data() } as Doubt)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'doubts'));
    return unsubscribe;
  }, [profile.uid, profile.role]);

  const handleAskDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoubt.trim()) return;
    try {
      await addDoc(collection(db, 'doubts'), {
        internId: profile.uid,
        internName: profile.name,
        question: newDoubt,
        status: 'open',
        createdAt: new Date().toISOString(),
      });
      setNewDoubt('');
    } catch (error) {
      console.error('Ask doubt error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Doubts & Support</h1>
      
      {profile.role === 'intern' && (
        <Card>
          <form onSubmit={handleAskDoubt} className="flex gap-2">
            <input 
              className="flex-1 rounded-lg border border-zinc-200 p-2 focus:border-black focus:outline-none"
              placeholder="Ask a question to your mentor..."
              value={newDoubt}
              onChange={e => setNewDoubt(e.target.value)}
            />
            <Button type="submit">
              <Send size={18} className="mr-2" />
              Ask
            </Button>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {doubts.map(doubt => (
          <Card key={doubt.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400">{doubt.internName} • {new Date(doubt.createdAt).toLocaleString()}</p>
                <p className="mt-1 font-medium">{doubt.question}</p>
              </div>
              <Badge variant={doubt.status === 'resolved' ? 'success' : 'warning'}>
                {doubt.status}
              </Badge>
            </div>
            {doubt.answer ? (
              <div className="rounded-lg bg-zinc-50 p-3 text-sm">
                <p className="font-bold">Mentor Answer:</p>
                <p className="mt-1 text-zinc-600">{doubt.answer}</p>
              </div>
            ) : profile.role === 'admin' ? (
              <div className="flex gap-2">
                <input 
                  className="flex-1 rounded-lg border p-1 text-sm" 
                  placeholder="Type your answer..." 
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      updateDoc(doc(db, 'doubts', doubt.id), { 
                        answer: (e.target as HTMLInputElement).value, 
                        status: 'resolved',
                        mentorId: profile.uid
                      });
                    }
                  }}
                />
              </div>
            ) : (
              <p className="text-xs italic text-zinc-400">Waiting for mentor response...</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

const InternProfileModal = ({ intern, onClose }: { intern: UserProfile; onClose: () => void }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qTasks = query(collection(db, 'tasks'), where('assignedTo', '==', intern.uid), orderBy('createdAt', 'desc'));
    const qDoubts = query(collection(db, 'doubts'), where('internId', '==', intern.uid), orderBy('createdAt', 'desc'));

    const unsubTasks = onSnapshot(qTasks, s => {
      setTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));
    const unsubDoubts = onSnapshot(qDoubts, s => {
      setDoubts(s.docs.map(d => ({ id: d.id, ...d.data() } as Doubt)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'doubts'));

    return () => {
      unsubTasks();
      unsubDoubts();
    };
  }, [intern.uid]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-600 text-xl">
              {intern.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold">{intern.name}</h2>
              <p className="text-sm text-zinc-500">{intern.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Tasks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold">
                  <ClipboardList size={18} className="text-blue-600" />
                  Assigned Tasks
                </h3>
                <Badge>{tasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="rounded-xl border border-zinc-100 p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold">{task.title}</p>
                      <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in-progress' ? 'warning' : 'default'}>
                        {task.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-zinc-500 line-clamp-2">{task.description}</p>
                    
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-zinc-400 uppercase">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            task.progress === 100 ? "bg-emerald-500" : "bg-blue-500"
                          )}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>

                    <p className="mt-3 text-[10px] text-zinc-400">Deadline: {new Date(task.deadline).toLocaleDateString()}</p>
                  </div>
                ))}
                {tasks.length === 0 && !loading && <p className="py-8 text-center text-xs text-zinc-400">No tasks assigned yet.</p>}
              </div>
            </div>

            {/* Doubts Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold">
                  <MessageSquare size={18} className="text-purple-600" />
                  Recent Doubts
                </h3>
                <Badge>{doubts.length}</Badge>
              </div>
              <div className="space-y-3">
                {doubts.map(doubt => (
                  <div key={doubt.id} className="rounded-xl border border-zinc-100 p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{doubt.question}</p>
                      <Badge variant={doubt.status === 'resolved' ? 'success' : 'warning'}>
                        {doubt.status}
                      </Badge>
                    </div>
                    {doubt.answer && (
                      <div className="mt-2 rounded-lg bg-zinc-50 p-2 text-[11px] text-zinc-600">
                        <p className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Mentor Response</p>
                        <p className="mt-0.5">{doubt.answer}</p>
                      </div>
                    )}
                    <p className="mt-2 text-[10px] text-zinc-400">{new Date(doubt.createdAt).toLocaleString()}</p>
                  </div>
                ))}
                {doubts.length === 0 && !loading && <p className="py-8 text-center text-xs text-zinc-400">No doubts asked yet.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-100 p-6 bg-zinc-50/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-4">
              <p><span className="text-zinc-400">Status:</span> <Badge variant={intern.status === 'active' ? 'success' : 'default'}>{intern.status}</Badge></p>
              <p><span className="text-zinc-400">Joined:</span> {new Date(intern.joiningDate || '').toLocaleDateString()}</p>
            </div>
            <Button variant="primary" size="sm">Edit Profile</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const InternsPage = () => {
  const [interns, setInterns] = useState<UserProfile[]>([]);
  const [selectedIntern, setSelectedIntern] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'intern'));
    const unsubscribe = onSnapshot(q, s => {
      setInterns(s.docs.map(d => d.data() as UserProfile));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    return unsubscribe;
  }, []);

  const filteredInterns = interns.filter(intern => 
    intern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    intern.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendCertificate = async (intern: UserProfile) => {
    // Simulated certificate generation and email
    alert(`Generating certificate for ${intern.name}...`);
    await fetch('/api/automation/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: intern.email,
        subject: 'Your Internship Certificate',
        body: `Congratulations ${intern.name}! Your certificate is attached.`
      })
    });
    alert('Certificate sent successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Manage Interns</h1>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredInterns.map(intern => (
          <Card key={intern.uid} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-600">
                  {intern.name[0]}
                </div>
                <div>
                  <h3 className="font-bold">{intern.name}</h3>
                  <p className="text-xs text-zinc-500">{intern.email}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="text-zinc-400">Status:</span> <Badge variant={intern.status === 'active' ? 'success' : 'default'}>{intern.status}</Badge></p>
                <p><span className="text-zinc-400">Joined:</span> {new Date(intern.joiningDate || '').toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleSendCertificate(intern)}>
                  Certificate
                </Button>
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSelectedIntern(intern)}>
                  View Profile
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full">Edit</Button>
            </div>
          </Card>
        ))}
        {filteredInterns.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-zinc-500">
              {searchQuery ? `No interns found matching "${searchQuery}"` : 'No interns found.'}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedIntern && (
          <InternProfileModal 
            intern={selectedIntern} 
            onClose={() => setSelectedIntern(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ApplicationsPage = () => {
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'applications'), orderBy('appliedAt', 'desc'));
    const unsubscribe = onSnapshot(q, s => {
      setApps(s.docs.map(d => ({ id: d.id, ...d.data() } as Application)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'applications'));
    return unsubscribe;
  }, []);

  const handleStatus = async (id: string, status: 'accepted' | 'rejected') => {
    await updateDoc(doc(db, 'applications', id), { status });
    // In a real app, trigger automation here (email/whatsapp)
    fetch('/api/automation/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        to: apps.find(a => a.id === id)?.email, 
        subject: `Internship Application ${status}`,
        body: `Your application has been ${status}.`
      })
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Internship Applications</h1>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Contact</th>
              <th className="px-6 py-3 font-medium">Applied At</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {apps.map(app => (
              <tr key={app.id}>
                <td className="px-6 py-4 font-medium">{app.name}</td>
                <td className="px-6 py-4">
                  <p>{app.email}</p>
                  <p className="text-xs text-zinc-400">{app.whatsapp}</p>
                </td>
                <td className="px-6 py-4 text-zinc-500">{new Date(app.appliedAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <Badge variant={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'error' : 'default'}>
                    {app.status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Resume</a>
                    {app.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatus(app.id, 'accepted')} className="text-emerald-600 hover:underline">Accept</button>
                        <button onClick={() => handleStatus(app.id, 'rejected')} className="text-red-600 hover:underline">Reject</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading || (user && !profile)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-black"></div>
          <p className="text-sm text-zinc-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/apply" element={<PublicApplicationPage />} />
        
        {!user ? (
          <Route path="*" element={<LoginPage />} />
        ) : (
          <Route 
            path="*" 
            element={
              <div className="flex h-screen bg-zinc-50">
                {/* Desktop Sidebar */}
                <aside className="hidden w-64 lg:block">
                  <Sidebar role={profile?.role || 'intern'} />
                </aside>

                {/* Mobile Sidebar */}
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.aside 
                      initial={{ x: -280 }}
                      animate={{ x: 0 }}
                      exit={{ x: -280 }}
                      className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
                    >
                      <Sidebar role={profile?.role || 'intern'} onClose={() => setIsSidebarOpen(false)} />
                    </motion.aside>
                  )}
                </AnimatePresence>

                <main className="flex-1 overflow-y-auto">
                  <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur-md">
                    <button className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
                      <Menu size={24} />
                    </button>
                    <div className="ml-auto flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">{profile?.name}</p>
                        <p className="text-xs text-zinc-500 capitalize">{profile?.role}</p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-600">
                        {profile?.name?.[0]}
                      </div>
                    </div>
                  </nav>

                  <div className="p-6">
                    <Routes>
                      <Route path="/" element={<Dashboard profile={profile!} />} />
                      <Route path="/tasks" element={<TasksPage profile={profile!} />} />
                      <Route path="/doubts" element={<DoubtsPage profile={profile!} />} />
                      {profile?.role === 'admin' && (
                        <>
                          <Route path="/applications" element={<ApplicationsPage />} />
                          <Route path="/interns" element={<InternsPage />} />
                        </>
                      )}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </main>
              </div>
            }
          />
        )}
      </Routes>
    </Router>
  );
}
