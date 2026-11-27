import React, { useEffect, useState, useCallback } from 'react';
import { LifeBuoy, RefreshCw, Clock, Image as ImageIcon } from 'lucide-react';
import { supabase } from './supabaseClient';

interface SupportTicket {
  id: string;
  ticket_number: number;
  business_id: string | null;
  category: string;
  subject: string;
  message: string;
  attachments: string[] | null;
  status: string;
  sla_hours: number;
  sla_due_at: string;
  created_at: string;
}

interface SupportTicketHistoryProps {
  businessId?: string | null;
  refreshKey?: number;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  closed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

export const SupportTicketHistory: React.FC<SupportTicketHistoryProps> = ({
  businessId,
  refreshKey = 0,
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTickets([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('support_tickets')
        .select('id, ticket_number, business_id, category, subject, message, attachments, status, sla_hours, sla_due_at, created_at')
        .order('created_at', { ascending: false });

      if (businessId) {
        query = query.eq('business_id', businessId);
      } else if (user.email) {
        query = query.ilike('user_email', user.email);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTickets((data as SupportTicket[]) || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not load support tickets.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets, refreshKey]);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-bold text-base">Your Support Tickets</h3>
        </div>
        <button
          type="button"
          onClick={loadTickets}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-4">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
          No support tickets submitted yet.
        </p>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const badgeClass =
              STATUS_STYLES[ticket.status] || STATUS_STYLES.open;
            const photos = Array.isArray(ticket.attachments) ? ticket.attachments : [];

            return (
              <div
                key={ticket.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300">
                      #{ticket.ticket_number}
                    </span>
                    <span className="font-semibold text-sm">{ticket.subject}</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${badgeClass}`}
                  >
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {ticket.message}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Category: <strong>{ticket.category}</strong></span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Target reply ({ticket.sla_hours}h SLA):{' '}
                    <strong>
                      {new Date(ticket.sla_due_at).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </strong>
                  </span>
                </div>

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {photos.map((url, idx) => (
                      <a
                        key={`${ticket.id}-img-${idx}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Photo {idx + 1}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};