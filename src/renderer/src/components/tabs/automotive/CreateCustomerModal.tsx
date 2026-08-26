import React, { useState } from 'react';
import { UserPlus, Building2, User, X, Check } from 'lucide-react';
import type { CreateCustomerOptions, CustomerType } from '@shared/automotiveTypes';
import clsx from 'clsx';

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
  const [type, setType] = useState<CustomerType>('individual');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'individual' && !firstName.trim() && !lastName.trim()) {
      setError('Please provide at least a first or last name');
      return;
    }

    if (type === 'business' && !businessName.trim()) {
      setError('Business name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        type,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        businessName: businessName.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Reset
      setFirstName('');
      setLastName('');
      setBusinessName('');
      setContactPerson('');
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
      <div className="w-full max-w-md bg-artemis-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden p-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
            <UserPlus className="w-4 h-4 text-artemis-accent" />
            Add New Customer
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Type Toggle: Individual vs Business */}
        <div className="flex gap-2 mt-4 p-1 bg-artemis-950 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setType('individual')}
            className={clsx(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
              type === 'individual'
                ? 'bg-artemis-accent/20 text-artemis-accent border border-artemis-accent/30'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <User className="w-3.5 h-3.5" />
            Individual Person
          </button>
          <button
            type="button"
            onClick={() => setType('business')}
            className={clsx(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
              type === 'business'
                ? 'bg-artemis-accent/20 text-artemis-accent border border-artemis-accent/30'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            Business / Fleet
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {type === 'individual' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ethan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                  className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blake"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Business Name / Company <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Performance Logistics"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                  className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Point of Contact / Manager
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Connor (Fleet Manager)"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="(555) 019-2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Address
            </label>
            <input
              type="text"
              placeholder="123 Industrial Way, Suite 4"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Notes & Preferences
            </label>
            <textarea
              placeholder="Preferences, fleet requirements, gate codes..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-artemis-accent hover:bg-silver-400 disabled:opacity-40 text-zinc-950 text-xs font-bold flex items-center gap-1.5"
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
