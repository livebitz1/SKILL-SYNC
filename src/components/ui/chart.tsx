import React from 'react';
import { cn } from "@/lib/utils"


export const ChartContainer = ({
  children,
  className,
}: { children: React.ReactNode; className?: string }) => {
  return <div className={cn("w-full h-full", className)}>{children}</div>;
};

export const ChartTooltip = ({ children, content }: { children?: React.ReactNode; content?: React.ReactNode }) => {
  return <div>{children}{content}</div>;
};

export const ChartTooltipContent = ({ children }: { children?: React.ReactNode }) => {
  return <div>{children}</div>;
};
