import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/auth/AuthForm';
import { useAuth } from '../contexts/AuthContext';

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();

  const handleEmailVerified = useCallback(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (firebaseUser?.emailVerified) {
      handleEmailVerified();
    }
  }, [firebaseUser?.emailVerified, handleEmailVerified]);

  return <AuthForm mode="email-verification" />;
};

export default EmailVerification;