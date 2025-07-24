import { StorageTest } from "@/components/admin/storage-test"
import { Header } from "@/components/layout/header"
import { RoleGuard } from "@/components/auth/role-guard"

export default function StorageTestPage() {
  return (
    <RoleGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container py-8">
          <div className="flex items-center justify-center">
            <StorageTest />
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
