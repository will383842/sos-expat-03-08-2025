import React from 'react';
import Modal from '../common/Modal';
import ReviewForm from './ReviewForm'; 

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  callId: string;
  serviceType: 'lawyer_call' | 'expat_call';
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  providerId,
  providerName,
  callId,
  serviceType
}) => {
  const handleSuccess = () => {
    onClose();
    // Optionally show a success message or refresh reviews
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Laisser un avis"
      size="medium"
    >
      <ReviewForm
        providerId={providerId}
        providerName={providerName}
        callId={callId}
        serviceType={serviceType}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  );
};

export default ReviewModal;