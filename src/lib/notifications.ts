import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface NotificationPayload {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  bookingId?: string;
}

export const sendNotification = async (payload: NotificationPayload) => {
  const gasUrl = (import.meta as any).env.VITE_GAS_WEBAPP_URL;

  // 1. Always record in Firestore for logging/backup
  try {
    await addDoc(collection(db, 'notifications'), {
      ...payload,
      status: 'pending',
      createdAt: serverTimestamp(),
      method: gasUrl ? 'gas' : 'internal-queue'
    });
  } catch (err) {
    console.error('Error logging notification to Firestore:', err);
  }

  // 2. If GAS URL is provided, call it directly for real-time sending
  if (gasUrl) {
    try {
      // We use no-cors if the GAS script isn't configured for CORS, 
      // but 'cors' is better for knowing if it succeeded.
      // Most GAS Web Apps require a redirect, so we handle it.
      const response = await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors', // GAS often has CORS issues with standard Fetch, no-cors is safer for basic notification
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      console.log('Notification sent to GAS');
      return true;
    } catch (err) {
      console.error('Error calling Google Apps Script:', err);
      return false;
    }
  }

  return false;
};
