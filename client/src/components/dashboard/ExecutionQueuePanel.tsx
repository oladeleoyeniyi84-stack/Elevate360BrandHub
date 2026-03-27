import { ListTodo, Play, X, CheckCircle } from "lucide-react";
import type { ExecutionQueueItem } from "@/types/execution";

const STATUS_COLORS: Record<string, string> = {
  pending:   "text-yellow-400",
  approved:  "text-blue-400",
  executing: "text-orange-400",
  completed: "text-green-400",
  failed:    "text-red-400",
  cancelled: "text-white/30",
};

type Props = {
  items: ExecutionQueueItem[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onExecuteNow: (id: number) => void;
  generating?: boolean;
  onGenerate: () => void;
};

export function ExecutionQueuePanel({ items, onApprove, onReject, onExecuteNow, generating, onGenerate }: Props) {
  const active = items.filter((i) => !["completed", "cancelled"].includes(i.status));
  const done = items.filter((i) => ["completed", "cancelled"].includes(i.status));

  return (
    <div className="lux-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-gold" />
          <h3 className="text-white font-semibold text-sm">Execution Queue</h3>
          {active.length > 0 && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">{active.length} pending</span>
          )}
        </div>
        <button
          data-testid="button-generate-queue"
          onClick={onGenerate}
          disabled={generating}
          className="text-xs text-white/40 hover:text-white transition px-3 py-1 rounded lux-card"
        >
          {generating ? "Running…" : "Run Engine"}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-6">No items in queue — run the execution engine to generate candidates</p>
      ) : (
        <div className="space-y-2">
          {[...active, ...done].map((item) => (
            <div key={item.id} data-testid={`queue-item-${item.id}`}
              className="lux-panel p-3 rounded-lg flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium capitalize">{item.actionType.replace(/_/g, " ")}</span>
                  <span className="text-white/40 text-xs capitalize">{item.area}</span>
                  <span className={`text-xs font-semibold capitalize ${STATUS_COLORS[item.status] ?? "text-white/40"}`}>
                    {item.status}
                  </span>
                  {item.requiresApproval && item.status === "pending" && (
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded">Needs approval</span>
                  )}
                </div>
                <div className="text-white/30 text-xs mt-0.5">
                  Priority: {item.priorityScore} · {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
              {item.status === "pending" && (
                <div className="flex gap-1 flex-shrink-0">
                  <button data-testid={`btn-approve-${item.id}`} onClick={() => onApprove(item.id)}
                    className="p-1.5 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 transition" title="Approve">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </button>
                  <button data-testid={`btn-execute-${item.id}`} onClick={() => onExecuteNow(item.id)}
                    className="p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition" title="Execute now">
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <button data-testid={`btn-reject-${item.id}`} onClick={() => onReject(item.id)}
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
