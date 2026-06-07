import { scenarios } from '@/lib/scenarios';
import { ScenarioCard } from '@/components/catalog/scenario-card';

export default function CatalogPage() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Incident Catalog</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          One-click scenario creation with realistic context, live metrics, and affected services.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {scenarios.map((scenario) => (
          <ScenarioCard key={scenario.key} scenario={scenario} />
        ))}
      </div>
    </div>
  );
}
