"use client";

import { motion, HTMLMotionProps } from "framer-motion";

type Props = HTMLMotionProps<"section"> & {
  children: React.ReactNode;
};

export default function Scene({ children, className = "", ...rest }: Props) {
  return (
    <motion.section
      className={`absolute inset-0 w-full h-full ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.section>
  );
}
