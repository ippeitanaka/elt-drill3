import { EnvCheck } from "@/components/debug/env-check"

export default function DebugPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <EnvCheck />
    </div>
  )
}
