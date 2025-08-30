import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Review } from '../types';
import Reviews from '../components/review/Reviews';

const DashboardReviews: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'reviews'),
      where('providerId', '==', user.id),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Review[];
      setReviews(data);
    });

    return () => unsubscribe();
  }, [user?.id]);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Mes avis clients</h2>
      <Reviews reviews={reviews} mode="list" />
    </div>
  );
};

export default DashboardReviews;


