"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Gavel, Bot, X } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  { label: "Submit Task", icon: Plus, href: "/tasks", color: "#00C2FF" },
  { label: "Register Agent", icon: Bot, href: "/agents", color: "#A78BFA" },
  { label: "View Auctions", icon: Gavel, href: "/auctions", color: "#00FF88" },
];

export function FloatingActionMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <>
            {actions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 16, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.8 }}
                transition={{ delay: i * 0.05, duration: 0.2, ease: "easeOut" }}
                onClick={() => { router.push(action.href); setOpen(false); }}
                className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-[#141414] border border-white/10 shadow-xl hover:border-white/20 transition-colors group"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${action.color}20` }}
                >
                  <action.icon size={13} style={{ color: action.color }} />
                </div>
                <span className="text-sm font-medium text-[#F5F5F5] whitespace-nowrap">{action.label}</span>
              </motion.button>
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-colors duration-200",
          open
            ? "bg-[#1A1A1A] border border-white/12"
            : "bg-[#00C2FF] hover:bg-[#00A8E0]"
        )}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          {open ? (
            <X size={20} className="text-[#F5F5F5]" />
          ) : (
            <Plus size={20} className="text-[#080808] font-bold" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}
