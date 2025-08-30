import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { playAvailabilityReminder } from './playAvailabilityReminder';
import voiceMessages from './voiceTranslateMessages';
import Modal from '../components/common/Modal'; // Ajout de l'import manquant

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoOffline: () => void;
  onDisableReminderToday: () => void;
  langCode: string;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onGoOffline,
  onDisableReminderToday,
  langCode
}) => {
  useEffect(() => {
    if (isOpen) {
      playAvailabilityReminder(langCode);
    }
  }, [isOpen, langCode]);

  const message = voiceMessages[langCode] || voiceMessages['en'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ðŸ”” Rappel de disponibilitÃ©"
      size="small"
    >
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-blue-100 rounded-full p-3">
            <Bell className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
        </div>

        <p className="text-center text-gray-700 text-sm sm:text-base leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col space-y-3 pt-4">
          <button
            onClick={onClose}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700"
          >
            âœ… Rester en ligne
          </button>

          <button
            onClick={onGoOffline}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700"
          >
            âŒ Passer hors ligne
          </button>

          <button
            onClick={onDisableReminderToday}
            className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg hover:bg-yellow-600"
          >
            ðŸ”• Ne plus me le rappeler aujourd'hui
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReminderModal;

