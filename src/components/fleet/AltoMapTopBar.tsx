import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onNewRoute: () => void;
}

export function AltoMapTopBar({ onNewRoute }: Props) {
  return (
    <div className="flex items-center justify-between bg-white border-b border-gray-100 h-12 px-4 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-800 tracking-tight">Alto Operations</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search orders, vehicles and assets"
            className="w-80 h-8 text-sm pl-8 bg-gray-50 border-gray-200 focus-visible:ring-1 focus-visible:ring-gray-300"
          />
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onNewRoute}>
          <Plus className="h-3.5 w-3.5" />
          New Route
        </Button>
      </div>
    </div>
  );
}
