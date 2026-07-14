import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-none border border-input bg-transparent px-3 py-3 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-2 focus-visible:border-ring focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-input/30 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-0 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
