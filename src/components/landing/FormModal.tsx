import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SmartForm } from "./SmartForm";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: "rent" | "slot" | null;
}

export const FormModal = ({ isOpen, onClose, initialType = null }: FormModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
          >
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* Close button - positioned outside the form content */}
              <button
                onClick={onClose}
                className="absolute -top-2 -right-2 z-20 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-600 transition-all shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
              
              <SmartForm key={initialType || 'default'} initialType={initialType} onClose={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
