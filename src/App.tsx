/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { OTPVerificationPage } from './components/OTPVerificationPage';
import { LawyerDashboard } from './components/LawyerDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { LawyerList } from './components/LawyerList';
import { LawyerDetail } from './components/LawyerDetail';
import { BookingPage } from './components/BookingPage';
import { ChatPage } from './components/ChatPage';
import { MeetingPage } from './components/MeetingPage';
import { CaseHistoryPage } from './components/CaseHistoryPage';
import { DocumentVaultPage } from './components/DocumentVaultPage';
import { PaymentPage } from './components/PaymentPage';
import { ReviewPage } from './components/ReviewPage';
import { AdminDashboard } from './components/AdminDashboard';
import { HelpPage } from './components/HelpPage';
import { ProfileSettingsPage } from './components/ProfileSettingsPage';
import { LawyerProfileSettingsPage } from './components/LawyerProfileSettingsPage';
import { Lawyer, ConsultationType } from './types';
import { getStoredUser, type ConsultationRow } from './api';
import { restoreSupabaseSession, signOutSupabase } from './supabaseAuth';
import { openWhatsAppConsultation } from './whatsapp';

type ViewState = 'landing' | 'login' | 'register' | 'forgot-password' | 'otp' | 'lawyer-dash' | 'client-dash' | 'admin-dash' | 'lawyer-list' | 'lawyer-detail' | 'booking' | 'chat' | 'meeting' | 'case-history' | 'document-vault' | 'payment' | 'review' | 'help' | 'profile-settings' | 'lawyer-profile-settings';

const dashboardViewForRole = (role?: 'client' | 'lawyer' | 'admin'): ViewState => {
  if (role === 'lawyer') return 'lawyer-dash';
  if (role === 'admin') return 'admin-dash';
  return 'client-dash';
};

const getInitialView = (): ViewState => {
  const token = localStorage.getItem('finprose_token');
  const user = getStoredUser();

  if (token && user?.role) {
    return dashboardViewForRole(user.role);
  }

  return 'landing';
};

const consultationToLawyer = (row: ConsultationRow): Lawyer => ({
  id: row.lawyer_id || 'selected-lawyer',
  name: row.lawyer_directory?.name || 'Advokat FINPROSE',
  specialty: row.lawyer_directory?.specialty || row.consultation_type,
  rating: 0,
  reviewCount: 0,
  experience: 0,
  price: row.price,
  image: row.lawyer_directory?.image || '/lawyer1.png',
  description: '',
  isOnline: false,
  languages: [],
  education: [],
  certifications: [],
  availability: []
});

export default function App() {
  const [view, setView] = useState<ViewState>(getInitialView);
  const [preAuthRole, setPreAuthRole] = useState<'client' | 'lawyer' | 'admin'>('client');
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [meetingMode, setMeetingMode] = useState<'video' | 'voice'>('video');
  const [bookingData, setBookingData] = useState<any>(null);
  const [initialConsultationType, setInitialConsultationType] = useState<ConsultationType>(ConsultationType.CHAT);

  useEffect(() => {
    restoreSupabaseSession().then((user) => {
      if (user) {
        setView(dashboardViewForRole(user.role));
      }
    });
  }, []);

  const handleAuth = (role: 'client' | 'lawyer' | 'admin') => {
    setView(dashboardViewForRole(role));
  };

  const startOTP = () => {
    setView('otp');
  };

  const handleLogout = async () => {
    await signOutSupabase();
    setView('landing');
  };

  const handleBackToHome = () => {
    const token = localStorage.getItem('finprose_token');
    const user = getStoredUser();

    if (token && user?.role) {
      setView(dashboardViewForRole(user.role));
      return;
    }

    setView('landing');
  };

  const handleSelectLawyer = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setView('lawyer-detail');
  };

  const handleConfirmBooking = (data: any) => {
    console.log('Booking Confirmed:', data);
    setBookingData(data);
    setView('payment');
  };

  return (
    <div className="min-h-screen">
      {view === 'landing' && (
        <LandingPage 
          onEnterApp={() => setView('login')} 
          onBrowseLawyers={() => setView('lawyer-list')}
          onSelectLawyer={handleSelectLawyer}
        />
      )}
      {view === 'login' && (
        <LoginPage 
          onLogin={handleAuth} 
          onNavigateToRegister={() => setView('register')} 
          onBack={handleBackToHome}
          onForgotPassword={() => setView('forgot-password')}
        />
      )}
      {view === 'register' && (
        <RegisterPage 
          onRegister={handleAuth} 
          onNavigateToLogin={() => setView('login')} 
          onBack={handleBackToHome}
          onVerifyOTP={startOTP}
        />
      )}
      {view === 'forgot-password' && (
        <ForgotPasswordPage 
            onBack={() => setView('login')} 
            onVerifyOTP={startOTP}
        />
      )}
      {view === 'otp' && (
        <OTPVerificationPage 
            email="user@email.com"
            onVerified={() => handleAuth('client')}
            onBack={() => setView('login')}
        />
      )}
      {view === 'lawyer-list' && (
        <LawyerList 
          onBack={handleBackToHome} 
          onSelectLawyer={handleSelectLawyer}
        />
      )}
      {view === 'lawyer-detail' && selectedLawyer && (
        <LawyerDetail 
          lawyer={selectedLawyer}
          onBack={() => setView('lawyer-list')}
          onAction={(type) => {
            const nextType = type === 'book' ? ConsultationType.CHAT : type;
            setInitialConsultationType(nextType as ConsultationType);
            setMeetingMode(type === 'phone' ? 'voice' : 'video');
            setView('booking');
          }}
        />
      )}
      {view === 'booking' && selectedLawyer && (
        <BookingPage 
            lawyer={selectedLawyer}
            initialType={initialConsultationType}
            onBack={() => setView('lawyer-detail')}
            onConfirm={handleConfirmBooking}
        />
      )}
      {view === 'chat' && selectedLawyer && (
        <ChatPage 
          lawyer={selectedLawyer}
          consultationId={bookingData?.consultationId || bookingData?.id}
          clientId={bookingData?.clientId}
          onBack={() => setView('review')}
          currentUserRole={getStoredUser()?.role === 'lawyer' ? 'lawyer' : 'client'}
          onStartCall={(mode) => {
            setMeetingMode(mode);
            setView('meeting');
          }}
        />
      )}
      {view === 'meeting' && selectedLawyer && (
        <MeetingPage 
          lawyer={selectedLawyer}
          isVoiceOnly={meetingMode === 'voice'}
          onEndCall={() => setView('review')}
        />
      )}
      {view === 'admin-dash' && (
        <AdminDashboard onLogout={handleLogout} />
      )}
      {view === 'lawyer-dash' && (
        <LawyerDashboard
          onLogout={handleLogout}
          onViewProfile={() => setView('lawyer-profile-settings')}
          onOpenConsultation={(consultation) => {
            const user = getStoredUser();
            setSelectedLawyer({
              id: consultation.lawyer_id,
              name: user?.name || consultation.lawyer_directory?.name || 'Advokat FINPROSE',
              specialty: consultation.lawyer_directory?.specialty || 'Konsultasi Hukum',
              rating: 0,
              reviewCount: 0,
              experience: 0,
              price: consultation.price,
              image: consultation.lawyer_directory?.image || '/lawyer1.png',
              description: '',
              isOnline: true,
              languages: [],
              education: [],
              certifications: [],
              availability: []
            });
            setBookingData({
              id: consultation.id,
              consultationId: consultation.id,
              clientId: consultation.client_id,
              lawyerId: consultation.lawyer_id,
              type: consultation.consultation_type,
              price: consultation.price,
              day: consultation.scheduled_day,
              time: consultation.scheduled_time
            });
            setView('chat');
          }}
        />
      )}
      {view === 'client-dash' && (
        <ClientDashboard 
          onLogout={handleLogout} 
          onBrowseLawyers={() => setView('lawyer-list')} 
          onViewHistory={() => setView('case-history')}
          onViewDocuments={() => setView('document-vault')}
          onViewHelp={() => setView('help')}
          onViewSettings={() => setView('profile-settings')}
          onOpenConsultation={(row) => {
            setSelectedLawyer(consultationToLawyer(row));
            setBookingData({
              id: row.id,
              consultationId: row.id,
              clientId: row.client_id,
              lawyerId: row.lawyer_id,
              lawyerName: row.lawyer_directory?.name || 'Advokat FINPROSE',
              type: row.consultation_type || ConsultationType.CHAT,
              price: row.price,
              day: row.scheduled_day || undefined,
              time: row.scheduled_time || undefined
            });

            if (row.status === 'pending') {
              setView('payment');
              return;
            }

            const opened = openWhatsAppConsultation({
              consultationId: row.id,
              clientName: getStoredUser()?.name,
              lawyerName: row.lawyer_directory?.name || 'Advokat FINPROSE',
              type: row.consultation_type,
              day: row.scheduled_day,
              time: row.scheduled_time
            });
            if (!opened) setView('chat');
          }}
        />
      )}
      {view === 'help' && (
        <HelpPage onBack={() => setView('client-dash')} />
      )}
      {view === 'profile-settings' && (
        <ProfileSettingsPage onBack={() => setView('client-dash')} />
      )}
      {view === 'lawyer-profile-settings' && (
        <LawyerProfileSettingsPage onBack={() => setView('lawyer-dash')} />
      )}
      {view === 'case-history' && (
        <CaseHistoryPage 
          onBack={() => setView('client-dash')} 
          onPayConsultation={(data) => {
            setBookingData({
              id: data.consultationId,
              consultationId: data.consultationId,
              clientId: data.clientId,
              lawyerId: data.lawyerId,
              lawyerName: data.lawyerName,
              type: data.consultationType || ConsultationType.CHAT,
              price: data.price,
              day: data.date,
              time: data.time
            });
            import('./constants').then(c => {
              const found = c.LAWYERS.find(lawyer => lawyer.id === data.lawyerId);
              setSelectedLawyer(found || {
                id: data.lawyerId || 'selected-lawyer',
                name: data.lawyerName,
                specialty: data.specialty,
                rating: 0,
                reviewCount: 0,
                experience: 0,
                price: data.price,
                image: '/lawyer1.png',
                description: '',
                isOnline: false,
                languages: [],
                education: [],
                certifications: [],
                availability: []
              });
              setView('payment');
            });
          }}
          onContinueDiscussion={(data) => {
            const user = getStoredUser();
            const opened = openWhatsAppConsultation({
              consultationId: data.consultationId,
              clientName: user?.name,
              lawyerName: data.lawyerName,
              type: data.consultationType,
              day: data.date,
              time: data.time
            });
            if (!opened) {
              setSelectedLawyer({
                id: data.lawyerId || 'selected-lawyer',
                name: data.lawyerName,
                specialty: data.specialty,
                rating: 0,
                reviewCount: 0,
                experience: 0,
                price: data.price,
                image: '/lawyer1.png',
                description: '',
                isOnline: false,
                languages: [],
                education: [],
                certifications: [],
                availability: []
              });
              setBookingData({
                id: data.consultationId,
                consultationId: data.consultationId,
                clientId: data.clientId,
                lawyerId: data.lawyerId,
                lawyerName: data.lawyerName,
                type: data.consultationType || ConsultationType.CHAT,
                price: data.price,
                day: data.date,
                time: data.time
              });
              setView('chat');
            }
          }}
        />
      )}
      {view === 'document-vault' && (
        <DocumentVaultPage onBack={() => setView('client-dash')} />
      )}
      {view === 'payment' && selectedLawyer && (
        <PaymentPage 
          bookingData={bookingData}
          onBack={() => setView('booking')}
          onSuccess={() => {
            if (bookingData?.type === ConsultationType.VIDEO) {
              setMeetingMode('video');
              setView('meeting');
            } else if (bookingData?.type === ConsultationType.PHONE) {
              setMeetingMode('voice');
              setView('meeting');
            } else {
              setView('chat');
            }
          }}
        />
      )}
      {view === 'review' && selectedLawyer && (
        <ReviewPage 
            lawyer={selectedLawyer}
            consultationId={bookingData?.consultationId || bookingData?.id}
            onBack={() => setView('client-dash')}
            onSubmit={() => setView('client-dash')}
        />
      )}
    </div>
  );
}
