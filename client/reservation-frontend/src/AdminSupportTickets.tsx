import React, { useEffect, useState, useCallback } from 'react';
import { LifeBuoy, RefreshCw, Clock, Image as ImageIcon, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from './supabaseClient';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface SupportTicketRow {
  id: string;
  ticket_number: number;
  business_id: string | null;
  business_name: string | null;
  user_email: string | null;
  package_tier: string | null;
  category: string;
  subject: string;
  message: string;
  attachments: string[] | null;
  current_route: string | null;
  status: TicketStatus;
  sla_hours: number;
  sla_due_at: string;
  created_at: string;
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const AdminSupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | TicketStatus>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAllTickets = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    try {
      let query = supabase
        .from('support_tickets')
        .select(
          'id, ticket_number, business_id, business_name, user_email, package_tier, category, subject, message, attachments, current_route, status, sla_hours, sla_due_at, created_at'
        )
        .order('sla_due_at', { ascending: true });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTickets((data as SupportTicketRow[]) || []);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to load support tickets.',
      });
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchAllTickets();
  }, [fetchAllTickets]);

  const handleStatusChange = async (ticketId: string, nextStatus: TicketStatus) => {
    setUpdatingId(ticketId);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: nextStatus })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus } : t))
      );

      setFeedback({
        type: 'success',
        text: `Ticket updated to "${nextStatus.replace('_', ' ')}".`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Could not update ticket status.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="font-bold text-lg">Support Ticket Queue (SLA)</h2>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | TicketStatus)}
            aria-label="Filter tickets by status"
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <button
            type="button"
            onClick={fetchAllTickets}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-6">Loading support queue...</p>
      ) : tickets.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-6">
          No support tickets match the selected filter.
        </p>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const isActive = ticket.status === 'open' || ticket.status === 'in_progress';
            const isOverdue = isActive && new Date(ticket.sla_due_at).getTime() < Date.now();
            const photos = Array.isArray(ticket.attachments) ? ticket.attachments : [];

            return (
              <div
                key={ticket.id}
                className={`p-4 rounded-xl border space-y-3 ${
                  isOverdue
                    ? 'bg-red-50/40 dark:bg-red-950/20 border-red-300 dark:border-red-800'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300">
                        #{ticket.ticket_number}
                      </span>
                      <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                        {(ticket.package_tier || 'starter').toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {ticket.business_name || 'Unknown Business'} • {ticket.user_email || 'No email'}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm">{ticket.subject}</h3>
                  </div>

                  <select
                    value={ticket.status}
                    disabled={updatingId === ticket.id}
                    onChange={(e) => handleStatusChange(ticket.id, e.target.value as TicketStatus)}
                    aria-label={`Status for ticket ${ticket.ticket_number}`}
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {ticket.message}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    Category: <strong>{ticket.category}</strong>
                    {ticket.current_route ? ` • Route: ${ticket.current_route}` : ''}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      isOverdue ? 'text-red-600 dark:text-red-400' : ''
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {isOverdue ? 'SLA Overdue: ' : `SLA (${ticket.sla_hours}h): `}
                    {new Date(ticket.sla_due_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {photos.map((url, idx) => (
                      <a
                        key={`${ticket.id}-photo-${idx}`}
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