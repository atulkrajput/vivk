import { MaintenanceMode } from '@/components/ui/MaintenanceMode'
import { isMaintenanceMode, getMaintenanceMessage } from '@/lib/error-handling'
import { redirect } from 'next/navigation'

export default function MaintenancePage() {
  // If not in maintenance mode, redirect to home
  if (!isMaintenanceMode()) {
    redirect('/')
  }

  return (
    <MaintenanceMode 
      message={getMaintenanceMessage()}
      estimatedTime="We'll be back shortly"
      showRetry={true}
    />
  )
}