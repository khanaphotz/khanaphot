import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { 
  format, 
  parse, 
  differenceInHours, 
  isAfter,
  parseISO
} from 'date-fns';
import { 
  History as HistoryIcon, 
  Calendar, 
  Clock, 
  XCircle, 
  CheckCircle, 
  AlertTriangle,
  Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const History: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('userEmail', '==', user.email),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => unsubscribe();
  }, [user]);

  const canCancel = (bookingDate: string, startTime: string) => {
    try {
      const bookingStart = parse(`${bookingDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const now = new Date();
      // Rule: Can cancel if at least 24 hours before the start time
      return differenceInHours(bookingStart, now) >= 24;
    } catch (e) {
      return false;
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (confirmCancelId !== bookingId) {
      setConfirmCancelId(bookingId);
      setTimeout(() => {
        setConfirmCancelId(prev => prev === bookingId ? null : prev);
      }, 5000);
      return;
    }

    setCancellingId(bookingId);
    const loadToast = toast.loading('กำลังดำเนินการยกเลิก...');

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
      toast.success('ยกเลิกการจองเรียบร้อยแล้ว', { id: loadToast });
    } catch (error) {
      toast.error('ไม่สามารถยกเลิกได้ กรุณาลองใหม่อีกครั้ง');
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    } finally {
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <HistoryIcon className="w-8 h-8 text-red-500" />
        <div>
          <h2 className="text-2xl font-display font-bold">My History</h2>
          <p className="text-neutral-400 text-sm">ประวัติการจองของคุณ</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500">Loading your history...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <p className="text-neutral-500">ไม่พบประวัติการจอง</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {bookings.map((booking) => {
              const bookingCancellable = booking.status === 'active' && canCancel(booking.date, booking.startTime);
              
              return (
                <motion.div
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Calendar className="w-4 h-4 text-red-500" />
                      <span>{format(parseISO(booking.date), 'dd MMMM yyyy')}</span>
                    </div>
                    <div className="text-xs font-bold text-red-500/80 mb-1">
                      {booking.roomName || 'Room Reservation'}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-neutral-400 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {booking.startTime} - {booking.endTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                          booking.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {booking.status === 'active' && (
                      bookingCancellable ? (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          disabled={cancellingId === booking.id}
                          className={cn(
                            "px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
                            confirmCancelId === booking.id
                              ? "bg-red-500 text-white animate-pulse"
                              : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20"
                          )}
                        >
                          {cancellingId === booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {confirmCancelId === booking.id ? "คลิกอีกครั้งเพื่อยืนยัน" : "ยกเลิกการจอง"}
                        </button>
                      ) : (
                        <div className="text-xs text-neutral-500 flex items-center gap-1 bg-neutral-800/50 border border-neutral-800 px-3 py-2 rounded-lg italic">
                          <AlertTriangle className="w-3 h-3" />
                          ยกเลิกไม่ได้ (ต้องล่วงหน้า 24 ชม.)
                        </div>
                      )
                    )}
                    {booking.status === 'cancelled' && (
                      <div className="text-neutral-500 text-sm flex items-center gap-1 italic opacity-60">
                        <XCircle className="w-4 h-4" />
                        Cancelled
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default History;
