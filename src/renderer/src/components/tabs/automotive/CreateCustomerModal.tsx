import React, { useState } from 'react';
import { UserPlus, X, Check } from 'lucide-react';
import type { CreateCustomerOptions } from '@shared/automotiveTypes';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (options: CreateCustomerOptions) => Promise<void>;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-artemis-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <UserPlus className="w-4 h-4 text-artemis-accent" />
            Add New Customer
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Customer Name / Business <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ethan Blake or Silent Lane LLC"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="(555) 019-2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Address
            </label>
            <input
              type="text"
              placeholder="123 Industrial Way, Suite 4"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Notes & Preferences
            </label>
            <textarea
              placeholder="Key notes, customer history, gate codes..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-1.5 rounded-lg bg-artemis-accent hover:bg-sky-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'Creating…' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
