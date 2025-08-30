// EmailPreviewModal.tsx
import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';

const EmailPreviewModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');

  return (
    <>
      <button className="hidden" onClick={() => setIsOpen(true)}>AperÃ§u</button>
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <Dialog.Panel className="bg-white p-6 rounded max-w-3xl w-full shadow-xl overflow-y-auto max-h-[90vh]">
            <Dialog.Title className="text-xl font-bold mb-4">AperÃ§u Email</Dialog.Title>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHTML }}
            />
            <div className="mt-4 text-right">
              <button className="btn btn-secondary" onClick={() => setIsOpen(false)}>Fermer</button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};

export default EmailPreviewModal;


