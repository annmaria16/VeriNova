import { useState } from "react";
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Task {
  id: string;
  name: string;
  description: string;
  expectedOutcome: string;
  evidenceType: string;
  method: string;
  status: "Verified" | "Running" | "Failed" | "Pending" | "Needs Clarification";
  confidence: number | null;
  date: string;
}

interface TaskTableProps {
  tasks: Task[];
  onDeleteTask?: (id: string) => void;
  onViewReport?: (id: string) => void;
  showActions?: boolean;
  limit?: number;
  simple?: boolean;
}

export default function TaskTable({
  tasks,
  onDeleteTask,
  onViewReport,
  showActions = true,
  limit,
  simple = false,
}: TaskTableProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  let sortField: string = "date";
  let sortOrder: string = "desc";
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter & Search logic
  const filteredTasks = tasks.filter((t) => {
    if (simple) return true;
    const matchesFilter = filter === "All" || t.status === filter;
    const matchesQuery =
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  // Sort logic
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aVal: any = (a as any)[sortField];
    let bVal: any = (b as any)[sortField];

    if (sortField === "confidence") {
      aVal = a.confidence ?? -1;
      bVal = b.confidence ?? -1;
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination & limit slicing
  const displayedTasks = (() => {
    if (limit) {
      return sortedTasks.slice(0, limit);
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTasks.slice(startIndex, startIndex + itemsPerPage);
  })();

  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-green-500/10 text-green-500 border border-green-500/20">
            Verified
          </span>
        );
      case "Running":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse">
            Running
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-red-500/10 text-red-500 border border-red-500/20">
            Failed
          </span>
        );
      case "Needs Clarification":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
            Clarifying
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      {!simple && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Local Search Input */}
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dash-secondary">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search outcome logs..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-dash-card border border-dash-border hover:border-dash-primary/50 focus:border-dash-primary rounded-xl pl-9 pr-4 py-2.5 text-xs text-dash-text focus:outline-none transition-all font-semibold"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 self-start md:self-auto">
            {["All", "Verified", "Running", "Failed", "Pending"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  filter === status
                    ? "bg-dash-primary/10 border-dash-primary/30 text-dash-primary"
                    : "border-dash-border bg-dash-card text-dash-secondary hover:text-dash-primary hover:bg-dash-primary/5"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Grid */}
      <div className="overflow-x-auto border border-dash-border rounded-xl bg-dash-card shadow-sm">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-dash-border text-[10px] font-bold text-dash-secondary uppercase tracking-wider bg-dash-bg">
              <th className="py-3.5 px-4.5">Task Name</th>
              <th className="py-3.5 px-3">Method</th>
              <th className="py-3.5 px-3">Status</th>
              <th className="py-3.5 px-3 text-right">Confidence</th>
              <th className="py-3.5 px-4 text-right">Date</th>
              {showActions && <th className="py-3.5 px-4.5 text-right">Action</th>}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-dash-border text-xs">
            <AnimatePresence mode="popLayout">
              {displayedTasks.map((task) => (
                <motion.tr
                  key={task.id}
                  layoutId={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hover:bg-dash-primary/5 transition-all group"
                >
                  {/* Task details */}
                  <td className="py-3.5 px-4.5 font-bold text-dash-text max-w-[260px]">
                    <div className="truncate group-hover:text-dash-primary transition-colors flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-dash-primary flex-shrink-0 animate-pulse-glow" />
                      <span>{task.name}</span>
                    </div>
                  </td>

                  {/* Method */}
                  <td className="py-3.5 px-3 font-semibold text-dash-secondary">
                    {task.method}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3">
                    {getStatusBadge(task.status)}
                  </td>

                  {/* Confidence */}
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-dash-text">
                    {task.confidence !== null ? `${task.confidence}%` : "—"}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-right font-mono text-[10px] text-dash-secondary font-semibold">
                    {task.date} 10:30 AM
                  </td>

                  {/* Action row */}
                  {showActions && (
                    <td className="py-3.5 px-4.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onViewReport && (
                          <button
                            onClick={() => onViewReport(task.id)}
                            className="px-2.5 py-1 bg-dash-primary/10 hover:bg-dash-primary/20 text-dash-primary hover:text-dash-hover rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border border-dash-primary/10 shadow-sm"
                          >
                            View Report
                          </button>
                        )}
                        {onDeleteTask && !simple ? (
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1.5 text-dash-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all"
                            title="Delete verification record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          !onViewReport && (
                            <button className="p-1.5 text-dash-secondary hover:text-dash-primary rounded hover:bg-dash-primary/5 cursor-pointer">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {displayedTasks.length === 0 && (
          <div className="py-10 text-center text-dash-secondary text-xs font-semibold">
            No outcomes registered in this state index.
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {tasks.length > 0 && (
        <div className="flex items-center justify-between pt-3 pb-1">
          <span className="text-[10px] text-dash-secondary font-black uppercase tracking-wider">
            Showing 1 to {displayedTasks.length} of {tasks.length} results
          </span>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 border border-dash-border hover:border-dash-primary text-dash-secondary hover:text-dash-primary rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer bg-dash-card"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-[10px] font-black px-2 py-1 text-dash-primary bg-dash-primary/10 border border-dash-primary/20 rounded-lg">
              {currentPage}
            </span>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 border border-dash-border hover:border-dash-primary text-dash-secondary hover:text-dash-primary rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer bg-dash-card"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
