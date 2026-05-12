import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { 
  format, 
  addDays, 
  addMonths,
  isSunday, 
  setHours, 
  setMinutes, 
  isBefore, 
  isAfter, 
  parse 
} from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { sendNotification } from '../lib/notifications';
import { 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  Phone, 
  User as UserIcon, 
  Building,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

// No local redeclaration of OperationType or handleFirestoreError needed
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [date, setDate] = useState<Date>(addDays(new Date(), 1));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [reason, setReason] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true);
      try {
        const q = query(collection(db, 'rooms'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRooms(roomsData);
        if (roomsData.length > 0) {
          setSelectedRoomId(roomsData[0].id);
        }
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, []);

  const isAdmin = useMemo(() => {
    const adminEmails = ['admin@bu.ac.th', 'medisci.tak@gmail.com', 'khanaphot.w@bu.ac.th'];
    return user && adminEmails.includes(user.email || '');
  }, [user]);

  const handleSeedRooms = async () => {
    const loadToast = toast.loading('กำลังตั้งค่าห้องเริ่มต้น...');
    try {
      const defaultRooms = [
        { name: 'DEBI Lab', location: 'A7-109', capacity: 50, isActive: true, createdAt: serverTimestamp() },
        { name: 'AI Studio by DMK', location: 'A7-310', capacity: 100, isActive: true, createdAt: serverTimestamp() }
      ];
      const roomsCol = collection(db, 'rooms');
      for (const r of defaultRooms) {
        await addDoc(roomsCol, r);
      }
      toast.success('ตั้งค่าห้องเริ่มต้นเรียบร้อยแล้ว กรุณารีเฟรชหน้าจอ');
      // Refresh local state
      const snapshot = await getDocs(query(roomsCol, where('isActive', '==', true)));
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomsData);
      if (roomsData.length > 0) setSelectedRoomId(roomsData[0].id);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการตั้งค่า');
    }
  };

  // Constraints
  const minDate = new Date();
  const maxDate = addMonths(new Date(), 2);

  const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedRoomId), [rooms, selectedRoomId]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setPhoneNumber(value);
  };

  const filterDates = (date: Date) => {
    return !isSunday(date);
  };

  const validateOverlap = async () => {
    if (!selectedRoomId) return true;
    const formattedDate = format(date, 'yyyy-MM-dd');
    const path = 'bookings';
    try {
      const q = query(
        collection(db, path),
        where('roomId', '==', selectedRoomId),
        where('date', '==', formattedDate),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(q);
      const existingBookings = querySnapshot.docs.map(doc => doc.data());

      const newStart = parse(startTime, 'HH:mm', new Date());
      const newEnd = parse(endTime, 'HH:mm', new Date());

      for (const booking of existingBookings) {
        const bookedStart = parse(booking.startTime, 'HH:mm', new Date());
        const bookedEnd = parse(booking.endTime, 'HH:mm', new Date());

        // Overlap logic: (StartA < EndB) and (EndA > StartB)
        if (newStart < bookedEnd && newEnd > bookedStart) {
          return true; // Overlaps
        }
      }
      return false; // No overlap
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRoom) return;

    // Time constraints validation: 08:45 - 17:00
    const startObj = parse(startTime, 'HH:mm', new Date());
    const endObj = parse(endTime, 'HH:mm', new Date());
    const limitStart = setMinutes(setHours(new Date(), 8), 45);
    const limitEnd = setHours(new Date(), 17);

    if (isBefore(startObj, limitStart) || isAfter(endObj, limitEnd)) {
      alert("เวลาที่เลือกต้องอยู่ระหว่าง 08:45 - 17:00 น.");
      return;
    }

    if (!isBefore(startObj, endObj)) {
      alert("เวลาเริ่มต้องก่อนเวลาสิ้นสุด");
      return;
    }

    setIsSubmitting(true);
    
    // Check overlap
    const overlaps = await validateOverlap();
    if (overlaps) {
      alert("เวลาที่คุณเลือกมีการจองไว้แล้วในห้องนี้ กรุณาเลือกช่วงเวลาอื่น");
      setIsSubmitting(false);
      return;
    }

    try {
      const path = 'bookings';
      const bookingRef = await addDoc(collection(db, path), {
        roomId: selectedRoomId,
        roomName: `${selectedRoom.name} (${selectedRoom.location})`,
        date: format(date, 'yyyy-MM-dd'),
        startTime,
        endTime,
        fullName,
        phoneNumber,
        department,
        reason,
        guestCount,
        status: 'active',
        userEmail: user.email,
        createdAt: serverTimestamp()
      });
      
      // Staff Notifications Trigger
      try {
        const staffSnapshot = await getDocs(collection(db, 'staff_emails'));
        const staffList = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        for (const staff of staffList) {
          await sendNotification({
            recipientEmail: staff.email,
            recipientName: staff.name,
            subject: `แจ้งเตือนการจองห้องเพื่อเตรียมความพร้อม - ${selectedRoom.name}`,
            body: `เรียน คุณ ${staff.name || 'เจ้าหน้าที่'},\n\nมีการจองห้องใหม่เข้ามาในระบบ รายละเอียดดังนี้:\n- ห้อง: ${selectedRoom.name} (${selectedRoom.location})\n- วันที่: ${format(date, 'dd/MM/yyyy')}\n- เวลา: ${startTime} - ${endTime} น.\n- ผู้จอง: ${fullName}\n- วัตถุประสงค์: ${reason}\n\nกรุณาเตรียมความพร้อมของห้องพัก (ทำความสะอาด และเปิดเครื่องปรับอากาศ) ก่อนถึงเวลาเริ่มการจองอย่างน้อย 30 นาที\n\nจึงเรียนมาเพื่อโปรดดำเนินการ\nระบบจองห้องอัตโนมัติ [DMK] Room Reservation`.trim(),
            bookingId: bookingRef.id
          });
        }
      } catch (staffErr) {
        console.error("Error triggering staff notifications:", staffErr);
      }

      setSuccess(true);
      // Reset form
      setFullName("");
      setPhoneNumber("");
      setDepartment("");
      setReason("");
      setGuestCount(1);
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 md:p-8 mt-8"
      >
        <div className="flex items-center gap-3 mb-8 border-b border-neutral-800 pb-4">
          <Calendar className="w-8 h-8 text-red-500" />
          <div>
            <h2 className="text-2xl font-display font-bold">Room Booking</h2>
            <p className="text-neutral-400 text-sm">DMK Room Reservation Form</p>
          </div>
        </div>

        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl flex items-center gap-3 text-green-400"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>การจองของคุณสำเร็จแล้ว! สามารถตรวจสอบได้ที่หน้าประวัติ</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <Building className="w-4 h-4" /> Select Room (เลือกห้องที่ต้องการจอง)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingRooms ? (
                <div className="col-span-full p-8 bg-neutral-800/50 rounded-xl border border-neutral-700 text-center flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent animate-spin rounded-full" />
                  <p className="text-neutral-400 text-sm">กำลังโหลดข้อมูลห้อง...</p>
                </div>
              ) : rooms.length === 0 ? (
                <div className="col-span-full p-8 bg-neutral-800/50 rounded-xl border border-neutral-700 text-center space-y-4">
                  <p className="text-neutral-500 italic">ยังไม่มีห้องให้จองในขณะนี้</p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleSeedRooms}
                      className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-900/20"
                    >
                      ตั้งค่าห้องเริ่มต้น (Initialize Default Rooms)
                    </button>
                  )}
                </div>
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      "p-4 rounded-xl border transition-all text-left group relative overflow-hidden",
                      selectedRoomId === room.id
                        ? "bg-red-500/10 border-red-500 ring-2 ring-red-500/20"
                        : "bg-neutral-800 border-neutral-700 hover:border-neutral-500"
                    )}
                  >
                    <div className="font-bold text-lg mb-1 flex items-center justify-between">
                      <span className={selectedRoomId === room.id ? "text-red-500" : "text-white"}>
                        {room.name}
                      </span>
                      {selectedRoomId === room.id && <CheckCircle2 className="w-5 h-5 text-red-500" />}
                    </div>
                    <div className="text-xs text-neutral-400 flex items-center gap-1">
                      <Building className="w-3 h-3" /> {room.location}
                    </div>
                    <div className="text-xs text-neutral-500 mt-2">
                      ความจุ {room.capacity} ท่าน
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Date (วันที่ใช้งาน)
              </label>
              <DatePicker
                selected={date}
                onChange={(date: Date | null) => date && setDate(date)}
                minDate={minDate}
                maxDate={maxDate}
                filterDate={filterDates}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-sans"
                placeholderText="เลือกวันที่"
                dateFormat="dd/MM/yyyy"
              />
              <p className="text-[10px] text-neutral-500">* จองได้ล่วงหน้าไม่เกิน 2 เดือน (ปิดวันอาทิตย์)</p>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Start (เริ่ม)
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> End (สิ้นสุด)
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Full Name (ชื่อ-นามสกุล)
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ระบุชื่อ-นามสกุล"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Phone (เบอร์โทร)
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="0XXXXXXXXX"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                <Building className="w-4 h-4" /> Dept/Faculty (หน่วยงาน/คณะ)
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="คณะเทคโนโลยีสารสนเทศ..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> Guests (จำนวนผู้ใช้)
              </label>
              <input
                type="number"
                required
                min="1"
                max="50"
                value={guestCount || ''}
                onChange={(e) => setGuestCount(e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Purpose (เหตุผลการใช้ห้อง)
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลการเข้าใช้ห้อง..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-ai-gradient hover:opacity-90 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isSubmitting ? "กำลังตรวจสอบข้อมูล..." : "ยืนยันการจอง"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Dashboard;
