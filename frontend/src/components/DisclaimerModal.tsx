import React from 'react';

interface DisclaimerModalProps {
  onAccept: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Important Disclaimer
          </h2>
          
          <div className="space-y-4 text-gray-700">
            <p className="font-semibold">
              Please read this carefully before using the Mental Health Chat Assistant:
            </p>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-semibold text-yellow-800">
                This is NOT a substitute for professional medical advice, diagnosis, or treatment.
              </p>
            </div>
            
            <ul className="list-disc list-inside space-y-2">
              <li>
                This chatbot provides <strong>emotional support and psychoeducation only</strong>. 
                It is not a therapist, counselor, or medical professional.
              </li>
              <li>
                <strong>Do not use this service for medical emergencies.</strong> If you are in crisis, 
                please contact emergency services (112) or crisis helplines immediately.
              </li>
              <li>
                This service does not replace therapy, medication, or professional mental health treatment.
              </li>
              <li>
                All conversations are confidential but may be logged for safety monitoring purposes.
              </li>
              <li>
                The chatbot may make mistakes. Always verify important information with a qualified professional.
              </li>
            </ul>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-semibold text-blue-800 mb-2">
                Crisis Resources (India):
              </p>
              <ul className="space-y-1 text-sm">
                <li>• KIRAN Mental Health Helpline: <strong>1800-599-0019</strong> (24/7)</li>
                <li>• Vandrevala Foundation: <strong>+91 9999 666 555</strong> (24/7)</li>
                <li>• Emergency Services: <strong>112</strong></li>
              </ul>
            </div>
            
            <p className="text-sm">
              By clicking "I Understand and Accept", you acknowledge that you have read and understood 
              this disclaimer and agree to use this service responsibly.
            </p>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={onAccept}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
                       transition-colors font-semibold focus:outline-none focus:ring-2 
                       focus:ring-primary-500 focus:ring-offset-2"
            >
              I Understand and Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
