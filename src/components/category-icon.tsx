import type { Category } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Armchair,
  Bed,
  Bike,
  BookOpen,
  FileText,
  Headphones,
  Laptop,
  Microscope,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

const ICONS: Record<Category, LucideIcon> = {
  Books: BookOpen,
  Gadgets: Headphones,
  Notes: FileText,
  Electronics: Laptop,
  Cycles: Bike,
  "Hostel Essentials": Bed,
  "Lab Equipment": Microscope,
  Furniture: Armchair,
};

export function CategoryIcon({
  category,
  className,
  size = 20,
  animated = true,
}: {
  category: Category;
  className?: string;
  size?: number;
  animated?: boolean;
}) {
  const Icon = ICONS[category] ?? Tag;
  const Comp: any = animated ? motion.div : "div";
  return (
    <Comp
      {...(animated
        ? {
            whileHover: { scale: 1.06 },
            transition: { type: "spring", stiffness: 420, damping: 28 },
          }
        : {})}
      className={cn("inline-flex items-center justify-center text-foreground", className)}
    >
      <Icon size={size} strokeWidth={2} />
    </Comp>
  );
}
