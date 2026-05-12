import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  addDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { format } from 'date-fns';
import { sendNotification } from '../lib/notifications';
import { 
  Shield, 
  UserPlus, 
  Trash2, 
  Mail, 
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AdminManagement: React.FC = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAdmins(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admins');
    });

    return () => unsubscribe();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !user?.email) return;

    setActionLoading(true);
    setMessage(null);
    
    const email = newEmail.trim().toLowerCase();

    try {
      // Check if already exists
      const docRef = doc(db, 'admins', email);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setMessage({ type: 'error', text: 'Email นี้เป็น Admin อยู่แล้ว' });
        setActionLoading(false);
        return;
      }

      await setDoc(docRef, {
        email,
        addedBy: user.email,
        createdAt: serverTimestamp()
      });

      // Send Notification
      try {
        await sendNotification({
          recipientEmail: email,
          subject: `คุณได้รับสิทธิ์เป็นผู้ดูแลระบบ (Admin Access Granted) - [DMK] Room Reservation`,
          body: `
เรียน ผู้ดูแลระบบ (Dear Administrator),

คุณได้รับสิทธิ์เข้าถึงระบบในฐานะผู้ดูแลระบบ (Admin) สำหรับระบบจองห้อง [DMK] Room Reservation เรียบร้อยแล้ว
You have been granted administrative access to the [DMK] Room Reservation system.

คุณสามารถจัดการข้อมูลการจอง ห้องพัก และการตั้งค่าระบบต่างๆ ได้ผ่านเมนู "Admin" ในเว็บไซต์
You can now manage bookings, room configurations, and system settings via the "Admin" menu on the website.

ขอแสดงความนับถือ (Sincerely),
ระบบจองห้องอัตโนมัติ [DMK] Room Reservation
          `.trim(),
          bookingId: 'admin-grant'
        });
      } catch (notifyErr) {
        console.error("Error sending admin notification:", notifyErr);
      }

      setMessage({ type: 'success', text: `เพิ่ม ${email} เป็น Admin เรียบร้อยแล้ว` });
      setNewEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'admins');
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเพิ่ม Admin' });
    } finally {
      setActionLoading(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const SUPER_ADMIN_EMAIL = 'medisci.tak@gmail.com';

  const handleRemoveAdmin = async (id: string, email: string) => {
    if (user?.email !== SUPER_ADMIN_EMAIL) {
      setMessage({ type: 'error', text: 'คุณไม่มีสิทธิ์ลบ Admin (เฉพาะ Super Admin เท่านั้น)' });
      setConfirmDelete(null);
      return;
    }

    if (email === SUPER_ADMIN_EMAIL) {
      setMessage({ type: 'error', text: 'ไม่สามารถลบ Super Admin ได้' });
      setConfirmDelete(null);
      return;
    }

    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'admins', id));
      setMessage({ type: 'success', text: `ลบ ${email} ออกเรียบร้อยแล้ว` });
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admins/${id}`);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบ Admin' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-red-500/10 rounded-2xl">
          <Shield className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">จัดการ Admin</h1>
          <p className="text-neutral-400">เพิ่มหรือลบผู้ดูแลระบบของ DEBI Lab</p>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Add Admin Form */}
        <div className="md:col-span-1">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sticky top-24">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-red-500" />
              เพิ่ม Admin ใหม่
            </h2>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  อีเมล (Email)
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@bu.ac.th"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={actionLoading || !newEmail}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                เพิ่ม Admin
              </button>
            </form>
          </div>
        </div>

        {/* Admin List */}
        <div className="md:col-span-2">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-semibold text-white">รายชื่อ Admin ปัจจุบัน</h2>
            </div>
            
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                <p className="text-neutral-400">กำลังโหลดข้อมูล...</p>
              </div>
            ) : admins.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                ไม่มีข้อมูล Admin ในระบบ
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {admins.map((admin) => (
                  <motion.div
                    layout
                    key={admin.id}
                    className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-neutral-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{admin.email}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1 text-xs text-neutral-500">
                            <Mail className="w-3 h-3" />
                            โดย: {admin.addedBy}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-neutral-500">
                            <Calendar className="w-3 h-3" />
                            {admin.createdAt?.toDate ? format(admin.createdAt?.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {user?.email === SUPER_ADMIN_EMAIL && admin.email !== SUPER_ADMIN_EMAIL && (
                      <div className="flex items-center gap-2">
                        {confirmDelete === admin.id ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 transition-all">
                            <span className="text-[10px] font-bold text-red-500 uppercase">Confirm?</span>
                            <button
                              onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                              disabled={actionLoading}
                              className="p-1 px-3 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-all"
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="p-1 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-[10px] font-bold rounded-lg transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(admin.id)}
                            className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all group"
                            title="ลบ Admin"
                          >
                            <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-neutral-400">
                <span className="font-semibold text-red-500">คำเตือน:</span> การเพิ่ม Admin จะทำให้ผู้ใช้คนนั้นมีสิทธิ์ในการจัดการการจองทั้งหมดและจัดการ Admin คนอื่นๆ (เพิ่มได้แต่ลบไม่ได้)
              </p>
              <p className="text-[10px] text-neutral-500 italic">
                * เฉพาะ Super Admin (medisci.tak@gmail.com) เท่านั้นที่มีสิทธิ์ลบรายชื่อผู้ดูแลระบบ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;
