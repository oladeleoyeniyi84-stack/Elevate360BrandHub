import { CheckCircle, X, Clock } from "lucide-react";
import type { ApprovalRequest } from "@/types/founder";

const STATUS_COLORS: Record<string, string> = {
  pending:  "text-yellow-400",
  approved: "text-green-400",
  rejected: "text-red-400",
  expired:  "text-white/30",
};

type Props = {
  requests: ApprovalRequest[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
};

export function ApprovalsQueuePanel({ requests, onApprove, onReject }: Props) {
  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div className="lux-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gold" />
        <h3 className="text-white font-semibold text-sm">Approval Requests</h3>
        {pending.length > 0 && (
          <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">{pending.length} pending</span>
        )}
      </div>

      {requests.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-6">No approval requests</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {[...pending, ...resolved].map((r) => (
            <div key={r.id} data-testid={`approval-request-${r.id}`}
              className="lux-panel p-3 rounded-lg flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium capitalize">{r.actionType.replace(/_/g, " ")}</span>
                  <span className="text-white/40 text-xs capitalize">{r.area}</span>
                  <span className={`text-xs font-semibold capitalize ${STATUS_COLORS[r.status] ?? "text-white/40"}`}>{r.status}</span>
                </div>
                <div className="text-white/30 text-xs mt-0.5">
                  Requested by: {r.requestedBy} · {new Date(r.createdAt).toLocaleDateString()}
                </div>
                {r.payloadJson && (
                  <div className="text-white/20 text-xs mt-0.5 truncate">
                    {JSON.stringify(r.payloadJson).slice(0, 80)}
                  </div>
                )}
              </div>
              {r.status === "pending" && (
                <div className="flex gap-1 flex-shrink-0">
                  <button data-testid={`btn-approve-request-${r.id}`} onClick={() => onApprove(r.id)}
                    className="p-1.5 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 transition" title="Approve">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </button>
                  <button data-testid={`btn-reject-request-${r.id}`} onClick={() => onReject(r.id)}
                    className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition" title="Reject">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
