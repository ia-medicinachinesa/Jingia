import { Skeleton } from "@/components/ui/skeleton"

/**
 * Componente de Loading Global para o Dashboard.
 * Exibido automaticamente pelo Next.js durante a navegação entre rotas do dashboard.
 */
export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Skeleton do Header/Título */}
      <div className="mb-10">
        <Skeleton className="h-10 w-48 mb-3 rounded-xl" />
        <Skeleton className="h-6 w-80 rounded-lg opacity-60" />
      </div>

      {/* Grid de Skeletons imitando os cards de assistentes */}
      <div className="space-y-12">
        {[1, 2].map((section) => (
          <section key={section}>
             <div className="flex items-center gap-4 mb-6">
                <Skeleton className="h-8 w-32 rounded-full" />
                <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4 shadow-sm">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                       <Skeleton className="h-5 w-32 rounded" />
                       <Skeleton className="h-4 w-full rounded" />
                       <Skeleton className="h-4 w-2/3 rounded" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-xl mt-4" />
                  </div>
                ))}
             </div>
          </section>
        ))}
      </div>
    </div>
  )
}
