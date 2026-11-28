import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LifeBuoy, Paperclip, X, Send, CheckCircle2 } from 'lucide-react';
import { supabase } from './supabaseClient';

interface SupportTicketFormProps {
  businessId?: string | null;
  businessName?: string;
  packageTier?: string;
  onTicketCreated?: () => void;
}

const MAX_FILES = 3;
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const SupportTicketForm: React.FC<SupportTicketFormProps> = ({
  businessId,
  businessName,
  packageTier,
  onTicketCreated,
}) => {
  const [category, setCategory] = useState('Bug / Technical Issue');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const location = useLocation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    const combined = [...files, ...picked];
    if (combined.length > MAX_FILES) {
      setErrorMsg(`You can attach up to ${MAX_FILES} photos per ticket.`);
      e.target.value = '';
      return;
    }

    for (const file of picked) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrorMsg('Only PNG, JPG, and WEBP images are allowed.');
        e.target.value = '';
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setErrorMsg(`"${file.name}" exceeds the 4 MB size limit.`);
        e.target.value = '';
        return;
      }
    }

    setFiles(combined);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (userId: string): Promise<string[]> => {
    const urls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('support-attachments')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Image upload failed.');
      }

      const { data: publicUrlData } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        urls.push(publicUrlData.publicUrl);
      }
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const attachmentUrls = files.length > 0
        ? await uploadPhotos(user?.id || 'anonymous')
        : [];

      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          subject,
          message,
          attachments: attachmentUrls,
          userEmail: user?.email || '',
          businessName: businessName || user?.user_metadata?.business_name || '',
          businessId: businessId || null,
          packageTier: packageTier || user?.user_metadata?.package_tier || '',
          currentRoute: `${location.pathname}${location.search}`,
          userAgent: navigator.userAgent,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not submit your support ticket.');
      }

      setSubmittedTicket(data.ticketId ? `#${data.ticketId}` : 'Submitted');
      setSubject('');
      setMessage('');
      setFiles([]);
      onTicketCreated?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while submitting the ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedTicket) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
        <h3 className="font-bold text-base">Support Ticket Received ({submittedTicket})</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          We no longer offer live chat. Our support team reviews tickets within our target response window and will reply via email.
        </p>
        <button
          type="button"
          onClick={() => setSubmittedTicket(null)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
        >
          Submit Another Ticket
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4"
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-bold text-base">Submit a Support Ticket</h3>
        </div>
        <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full">
          Ticket replies within 24h (Mon–Fri)
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Live chat is not available. Describe the issue clearly and attach up to {MAX_FILES} screenshots or photos (PNG, JPG, WEBP, max 4 MB each).
      </p>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
          >
            <option value="Bug / Technical Issue">Bug / Technical Issue</option>
            <option value="Billing & WiPay">Billing & WiPay</option>
            <option value="Booking Page & Calendar">Booking Page & Calendar</option>
            <option value="Account & Profile">Account & Profile</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
            Subject
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of the problem"
            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
          Problem Description
        </label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What happened, what did you expect, and what steps reproduce it?"
          className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
          Attach Photos ({files.length}/{MAX_FILES})
        </label>
        <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-purple-500 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
          <Paperclip className="w-4 h-4 text-purple-600" />
          <span>Choose images</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {files.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-slate-400 hover:text-red-500 cursor-pointer"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
      >
        <Send className="w-4 h-4" />
        <span>{submitting ? 'Submitting Ticket...' : 'Submit Ticket'}</span>
      </button>
    </form>
  );
};