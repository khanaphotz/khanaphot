import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  addDoc,
  limit
} from 'firebase/firestore';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { 
  startOfWeek, 
  endOfWeek, 
  parseISO, 
  isWithinInterval
} from 'date-fns';
import { 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Trash2, 
  Filter,
  Phone,
  Building,
  Users,
  Loader2,
  Plus,
  X,
  LayoutDashboard,
  Settings,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'rooms' | 'staff' | 'notifications'>('bookings');
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [staffEmails, setStaffEmails] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // New Room State
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState({ name: '', location: '', capacity: 20 });
  const [editRoomData, setEditRoomData] = useState<any>(null);

  // Staff State
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffName, setNewStaffName] = useState("");

  useEffect(() => {
    // Bookings Listener
    const qB = query(
      collection(db, 'bookings'),
      orderBy('date', 'desc'),
      orderBy('startTime', 'desc')
    );

    const unsubscribeB = onSnapshot(qB, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllBookings(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    // Rooms Listener
    const qR = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
    const unsubscribeR = onSnapshot(qR, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRooms(docs);
    }, (error) => {
      console.error("Error fetching rooms:", error);
    });

    // Staff Emails Listener
    const qS = query(collection(db, 'staff_emails'), orderBy('createdAt', 'desc'));
    const unsubscribeS = onSnapshot(qS, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStaffEmails(docs);
    }, (error) => {
      console.error("Error fetching staff emails:", error);
    });

    // Notifications Listener
    const qN = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeN = onSnapshot(qN, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(docs);
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => {
      unsubscribeB();
      unsubscribeR();
      unsubscribeS();
      unsubscribeN();
    };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });

    const weeklyBookings = allBookings.filter(b => {
      try {
        const bookingDate = parseISO(b.date);
        return isWithinInterval(bookingDate, { start, end });
      } catch {
        return false;
      }
    });

    const activeCount = weeklyBookings.filter(b => b.status === 'active').length;
    const cancelledCount = weeklyBookings.filter(b => b.status === 'cancelled').length;

    const hourCounts: Record<string, number> = {};
    weeklyBookings.forEach(b => {
      if (b.status === 'active') {
        const startH = parseInt(b.startTime.split(':')[0]);
        const endH = parseInt(b.endTime.split(':')[0]);
        for (let h = startH; h < endH; h++) {
          const hourStr = `${h}:00 - ${h+1}:00`;
          hourCounts[hourStr] = (hourCounts[hourStr] || 0) + 1;
        }
      }
    });

    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      total: weeklyBookings.length,
      active: activeCount,
      cancelled: cancelledCount,
      peakHour
    };
  }, [allBookings]);

  const handleDeleteBooking = async (bookingId: string) => {
    if (confirmDeleteId !== bookingId) {
      setConfirmDeleteId(bookingId);
      setTimeout(() => {
        setConfirmDeleteId(prev => prev === bookingId ? null : prev);
      }, 5000);
      return;
    }

    setDeletingId(bookingId);
    const loadToast = toast.loading('กำลังลบข้อมูลการจอง...');

    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      toast.success('ลบการจองเรียบร้อยแล้ว', { id: loadToast });
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล', { id: loadToast });
      handleFirestoreError(error, OperationType.DELETE, `bookings/${bookingId}`);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadToast = toast.loading('กำลังเพิ่มห้อง...');
    try {
      await addDoc(collection(db, 'rooms'), {
        ...newRoom,
        isActive: true,
        createdAt: serverTimestamp()
      });
      toast.success('เพิ่มห้องเรียบร้อยแล้ว', { id: loadToast });
      setIsAddingRoom(false);
      setNewRoom({ name: '', location: '', capacity: 20 });
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มห้อง', { id: loadToast });
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
    }
  };

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomId || !editRoomData) return;
    const loadToast = toast.loading('กำลังบันทึกการแก้ไข...');
    try {
      await updateDoc(doc(db, 'rooms', editingRoomId), {
        name: editRoomData.name,
        location: editRoomData.location,
        capacity: editRoomData.capacity
      });
      toast.success('แก้ไขข้อมูลสำเร็จแล้ว', { id: loadToast });
      setEditingRoomId(null);
      setEditRoomData(null);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการแก้ไข', { id: loadToast });
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${editingRoomId}`);
    }
  };

  const startEditing = (room: any) => {
    setEditingRoomId(room.id);
    setEditRoomData({ ...room });
    setIsAddingRoom(false);
  };

  const handleToggleRoomStatus = async (room: any) => {
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        isActive: !room.isActive
      });
      toast.success(`เปลี่ยนสถานะห้อง ${room.name} แล้ว`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const handleDeleteRoom = async (room: any) => {
    if (!window.confirm(`คุณต้องการลบห้อง ${room.name} ใช่หรือไม่? การจองที่เกี่ยวข้องอาจจะมีปัญหาได้`)) return;
    try {
      await deleteDoc(doc(db, 'rooms', room.id));
      toast.success(`ลบห้อง ${room.name} แล้ว`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rooms/${room.id}`);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (staffEmails.length >= 5) {
      toast.error('จำกัดจำนวนอีเมลแม่บ้านสูงสุด 5 ท่าน');
      return;
    }
    const loadToast = toast.loading('กำลังบันทึกข้อมูล...');
    try {
      await addDoc(collection(db, 'staff_emails'), {
        email: newStaffEmail.trim(),
        name: newStaffName.trim(),
        role: 'housekeeping',
        createdAt: serverTimestamp()
      });
      toast.success('บันทึกข้อมูลเรียบร้อยแล้ว', { id: loadToast });
      setNewStaffEmail("");
      setNewStaffName("");
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
      handleFirestoreError(error, OperationType.CREATE, 'staff_emails');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('คุณต้องการลบอีเมลนี้ใช่หรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'staff_emails', id));
      toast.success('ลบข้อมูลเรียบร้อยแล้ว');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `staff_emails/${id}`);
    }
  };

  const seedRooms = async () => {
    if (rooms.length > 0) return;
    const loadToast = toast.loading('กำลังตั้งค่าห้องเริ่มต้น...');
    try {
      const defaultRooms = [
        { name: 'DEBI Lab', location: 'A7-109', capacity: 50, isActive: true, createdAt: serverTimestamp() },
        { name: 'AI Studio by DMK', location: 'A7-310', capacity: 100, isActive: true, createdAt: serverTimestamp() }
      ];
      for (const r of defaultRooms) {
        await addDoc(collection(db, 'rooms'), r);
      }
      toast.success('ตั้งค่าห้องเริ่มต้นเรียบร้อยแล้ว', { id: loadToast });
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการตั้งค่า', { id: loadToast });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-neutral-800 pb-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <div>
            <h2 className="text-2xl font-display font-bold">Admin Panel</h2>
            <p className="text-neutral-400 text-sm">System Management & Statistics</p>
          </div>
        </div>

        <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('bookings')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'bookings' ? "bg-red-500 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <LayoutDashboard className="w-4 h-4" /> Bookings
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'rooms' ? "bg-red-500 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <Settings className="w-4 h-4" /> Manage Rooms
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'staff' ? "bg-red-500 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <Users className="w-4 h-4" /> Staff Notify
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'notifications' ? "bg-red-500 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <Clock className="w-4 h-4" /> Email Log
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'bookings' ? (
          <motion.div
            key="bookings"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="glass-card p-6 bg-gradient-to-br from-neutral-900 to-red-950/20">
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-2">Weekly Bookings</p>
                <p className="text-4xl font-bold font-display">{stats.total}</p>
              </div>
              <div className="glass-card p-6 border-l-4 border-green-500/50">
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-2">Active</p>
                <p className="text-4xl font-bold font-display text-green-400">{stats.active}</p>
              </div>
              <div className="glass-card p-6 border-l-4 border-red-500/50">
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-2">Cancelled</p>
                <p className="text-4xl font-bold font-display text-red-500">{stats.cancelled}</p>
              </div>
              <div className="glass-card p-6 bg-red-600/10">
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-2">Peak Hour (Weekly)</p>
                <p className="text-xl font-bold font-display text-red-300">{stats.peakHour}</p>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
                <h3 className="font-bold flex items-center gap-2">
                  <Filter className="w-4 h-4" /> All Bookings Control
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-neutral-800/50 text-neutral-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">User / Email</th>
                      <th className="px-6 py-4 font-semibold">Room & Details</th>
                      <th className="px-6 py-4 font-semibold">Date & Time</th>
                      <th className="px-6 py-4 font-semibold text-center">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-neutral-500">Loading data...</td>
                      </tr>
                    ) : allBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-neutral-500">No bookings found</td>
                      </tr>
                    ) : (
                      allBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-neutral-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{booking.fullName}</div>
                            <div className="text-xs text-neutral-500">{booking.userEmail}</div>
                            <div className="text-[10px] text-neutral-600 mt-1 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" /> {booking.phoneNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="text-xs font-bold text-red-500 mb-1">
                              {booking.roomName || 'N/A'}
                            </div>
                            <div className="text-[10px] items-center gap-1 text-neutral-400 mb-1 flex">
                              <Building className="w-2.5 h-2.5" /> {booking.department}
                            </div>
                            <div className="text-xs text-neutral-400 line-clamp-1 italic">
                              "{booking.reason}"
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 font-medium text-sm">
                              <Calendar className="w-3 h-3 text-red-500" />
                              {booking.date}
                            </div>
                            <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-1">
                              <Clock className="w-3 h-3" />
                              {booking.startTime} - {booking.endTime}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase inline-block ${
                              booking.status === 'active' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-red-500/20 text-red-500 border border-red-500/30'
                            }`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteBooking(booking.id)}
                              disabled={deletingId === booking.id}
                              className={cn(
                                "p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex items-center gap-2 ml-auto",
                                confirmDeleteId === booking.id 
                                  ? "bg-red-600 text-white px-4" 
                                  : "bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white"
                              )}
                              title={confirmDeleteId === booking.id ? "Click again to confirm" : "Delete Booking"}
                            >
                              {deletingId === booking.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : confirmDeleteId === booking.id ? (
                                <>
                                  <Trash2 className="w-4 h-4" />
                                  <span className="text-xs font-bold whitespace-nowrap">ยืนยันการลบ?</span>
                                </>
                              ) : (
                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'rooms' ? (
          <motion.div
            key="rooms"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Manage Bookable Rooms</h3>
              <div className="flex gap-2">
                {rooms.length === 0 && (
                  <button
                    onClick={seedRooms}
                    className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  >
                    Set Default Rooms
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsAddingRoom(true);
                    setEditingRoomId(null);
                  }}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add New Room
                </button>
              </div>
            </div>

            {(isAddingRoom || editingRoomId) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 border-red-500/30"
              >
                <form onSubmit={editingRoomId ? handleEditRoom : handleAddRoom} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-500 uppercase font-bold">Room Name</label>
                    <input
                      required
                      type="text"
                      value={editingRoomId ? editRoomData.name : newRoom.name}
                      onChange={e => editingRoomId 
                        ? setEditRoomData({...editRoomData, name: e.target.value})
                        : setNewRoom({...newRoom, name: e.target.value})
                      }
                      placeholder="e.g. DEBI Lab"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-500 uppercase font-bold">Location</label>
                    <input
                      required
                      type="text"
                      value={editingRoomId ? editRoomData.location : newRoom.location}
                      onChange={e => editingRoomId
                        ? setEditRoomData({...editRoomData, location: e.target.value})
                        : setNewRoom({...newRoom, location: e.target.value})
                      }
                      placeholder="e.g. A7-109"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-500 uppercase font-bold">Capacity</label>
                    <input
                      required
                      type="number"
                      value={editingRoomId ? editRoomData.capacity : newRoom.capacity}
                      onChange={e => editingRoomId
                        ? setEditRoomData({...editRoomData, capacity: parseInt(e.target.value)})
                        : setNewRoom({...newRoom, capacity: parseInt(e.target.value)})
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-all"
                    >
                      {editingRoomId ? 'Update Room' : 'Save Room'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingRoom(false);
                        setEditingRoomId(null);
                      }}
                      className="p-2 bg-neutral-800 text-neutral-400 hover:text-white rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map(room => (
                <div key={room.id} className={cn(
                  "glass-card p-6 relative group overflow-hidden border transition-all",
                  room.isActive ? "border-neutral-800" : "border-red-500/20 grayscale opacity-60"
                )}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className={cn("text-xl font-bold font-display", room.isActive ? "text-white" : "text-neutral-500")}>
                        {room.name}
                      </h4>
                      <p className="text-sm text-neutral-500 flex items-center gap-1">
                        <Building className="w-3 h-3" /> {room.location}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(room)}
                        className="p-2 text-neutral-500 hover:text-white"
                        title="Edit Room"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room)}
                        className="p-2 text-neutral-500 hover:text-red-500"
                        title="Delete Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800/50">
                    <div className="text-xs text-neutral-400">
                      Capacity: <span className="font-bold text-white">{room.capacity}</span>
                    </div>
                    <button
                      onClick={() => handleToggleRoomStatus(room)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                        room.isActive 
                          ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      )}
                    >
                      {room.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : activeTab === 'staff' ? (
          <motion.div
            key="staff"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* ... staff content ... */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-red-500">
                <Users className="w-5 h-5" /> Staff Email Management
              </h3>
              <p className="text-neutral-400 text-sm">
                จัดการอีเมลของแม่บ้านและเจ้าหน้าที่อาคาร สำหรับรับแจ้งเตือนเมื่อมีการจองห้อง (ระบบจะส่งเนื้อหารายละเอียดการจองให้โดยอัตโนมัติ)
              </p>
            </div>

            <div className="glass-card p-6 border-red-500/20 bg-gradient-to-br from-neutral-900 to-red-950/5">
              <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-300 mb-4">เพิ่มอีเมลเจ้าหน้าที่ตัวจริง (สูงสุด 5 ท่าน)</h4>
              <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-xs text-neutral-500 font-bold">ชื่อ-นามสกุล (เจ้าหน้าที่)</label>
                  <input
                    required
                    type="text"
                    value={newStaffName}
                    onChange={e => setNewStaffName(e.target.value)}
                    placeholder="ระบุชื่อเจ้าหน้าที่"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-neutral-500 font-bold">อีเมล Gmail (สำหรับรับแจ้งเตือน)</label>
                  <input
                    required
                    type="email"
                    value={newStaffEmail}
                    onChange={e => setNewStaffEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={staffEmails.length >= 5}
                  className="bg-ai-gradient hover:opacity-90 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg text-sm transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> เพิ่มเจ้าหน้าที่
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staffEmails.length === 0 ? (
                <div className="col-span-full p-12 bg-neutral-900/50 rounded-2xl border border-dashed border-neutral-800 text-center">
                  <p className="text-neutral-500 italic">ยังไม่มีรายชื่อเจ้าหน้าที่รับแจ้งเตือน</p>
                </div>
              ) : (
                staffEmails.map((staff) => (
                  <div key={staff.id} className="glass-card p-4 flex items-center justify-between group hover:border-red-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold uppercase text-xs">
                        {staff.name?.[0] || 'S'}
                      </div>
                      <div>
                        <div className="font-bold text-neutral-200">{staff.name}</div>
                        <div className="text-xs text-neutral-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {staff.email}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStaff(staff.id)}
                      className="p-2 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <h5 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Housekeeping Task Template</h5>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-400 space-y-2">
                <p className="text-red-500 font-bold">Subject: แจ้งเตือนการจองห้องเพื่อเตรียมความพร้อม - [ชื่อห้อง]</p>
                <p>เรียน ทีมงานแม่บ้านและเจ้าหน้าที่อาคาร,</p>
                <p>มีการจองห้องใหม่เข้ามาในระบบ รายละเอียดดังนี้:</p>
                <p>- ห้อง: [ชื่อห้อง]</p>
                <p>- วันที่: [วันที่]</p>
                <p>- เวลา: [เริ่ม] - [สิ้นสุด]</p>
                <p>- ผู้จอง: [ชื่อผู้จอง]</p>
                <p>- วัตถุประสงค์: [วัตถุประสงค์]</p>
                <p className="text-neutral-200 mt-4 font-sans italic">"กรุณาเตรียมความพร้อมของห้องพัก (ทำความสะอาด และเปิดเครื่องปรับอากาศ) ก่อนถึงเวลาเริ่มการจอง"</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-red-500" /> Notification Queue (Email Logs)
              </h3>
              <p className="text-neutral-400 text-sm">
                ตรวจสอบคิวการแจ้งเตือนที่ระบบสร้างขึ้น (System-generated logs for verification)
              </p>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-neutral-800/50 text-neutral-400 text-xs uppercase tracking-wider text-nowrap">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Sent to</th>
                      <th className="px-6 py-4 font-semibold">Subject</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Queued At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {notifications.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-neutral-500 italic">No notification history found</td>
                      </tr>
                    ) : (
                      notifications.map((n) => (
                        <tr key={n.id} className="hover:bg-neutral-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-neutral-200">{n.recipientName || 'Admin'}</div>
                            <div className="text-xs text-neutral-500">{n.recipientEmail}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-neutral-300 max-w-sm truncate" title={n.subject}>
                              {n.subject}
                            </div>
                            <div className="text-[10px] text-neutral-600 mt-1 truncate max-w-sm">
                              {n.body?.substring(0, 50)}...
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              n.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"
                            )}>
                              {n.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-xs text-neutral-500">
                              {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : 'Just now'}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
