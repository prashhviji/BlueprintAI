"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { newProjectId } from "@/lib/firebase/projects";

export default function NewProjectPage() {
  const router = useRouter();
  React.useEffect(() => {
    const id = newProjectId();
    router.replace(`/project/${id}`);
  }, [router]);
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Creating new project…
      </div>
    </div>
  );
}
