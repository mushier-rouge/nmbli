'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getAllMakes, getModelsForMakes, vehicles } from '@/lib/data/vehicles';

type VehicleSelectorProps = {
  makes: string[];
  models: string[];
  trims: string[];
  onMakesChange: (makes: string[]) => void;
  onModelsChange: (models: string[]) => void;
  onTrimsChange: (trims: string[]) => void;
};

export function VehicleSelector({
  makes,
  models,
  trims,
  onMakesChange,
  onModelsChange,
  onTrimsChange,
}: VehicleSelectorProps) {
  const [showMakeDropdown, setShowMakeDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showTrimDropdown, setShowTrimDropdown] = useState(false);

  const makeRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const trimRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (makeRef.current && !makeRef.current.contains(event.target as Node)) {
        setShowMakeDropdown(false);
      }
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
      if (trimRef.current && !trimRef.current.contains(event.target as Node)) {
        setShowTrimDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allMakes = getAllMakes()
    .filter((make): make is string => typeof make === 'string' && make != null)
    .map(make => String(make));
  const availableModels = makes.length > 0
    ? getModelsForMakes(makes)
        .filter((model): model is string => typeof model === 'string' && model != null)
        .map(model => String(model))
    : [];

  // Get available trims for selected makes/models
  const availableTrims = Array.from(
    new Set(
      makes.flatMap((make) =>
        vehicles[make]?.flatMap((modelData) =>
          models.includes(modelData.model)
            ? modelData.trims
                .filter((trim): trim is string => typeof trim === 'string' && trim != null)
                .map(trim => String(trim))
            : []
        ) || []
      )
    )
  ).sort();

  const toggleMake = (make: string) => {
    console.log('[VehicleSelector] toggleMake START', { make, currentMakes: makes, type: typeof make });
    // Only allow selecting one make at a time - if clicking the same make, deselect it
    const newMakes = makes.includes(make) ? [] : [make];
    console.log('[VehicleSelector] toggleMake calling onMakesChange', { newMakes });
    onMakesChange(newMakes);
    console.log('[VehicleSelector] toggleMake END');

    // Clear models and trims when changing makes
    if (newMakes.length === 0 || newMakes[0] !== makes[0]) {
      onModelsChange([]);
      onTrimsChange([]);
    }
  };

  const toggleModel = (model: string) => {
    const newModels = models.includes(model)
      ? models.filter((m) => m !== model)
      : [...models, model];
    onModelsChange(newModels);

    // Clear trims that are no longer available
    const newAvailableTrims = Array.from(
      new Set(
        makes.flatMap((make) =>
          vehicles[make]?.flatMap((modelData) =>
            newModels.includes(modelData.model) ? modelData.trims : []
          ) || []
        )
      )
    );
    const filteredTrims = trims.filter((t) => newAvailableTrims.includes(t));
    if (filteredTrims.length !== trims.length) {
      onTrimsChange(filteredTrims);
    }
  };

  const toggleTrim = (trim: string) => {
    onTrimsChange(
      trims.includes(trim) ? trims.filter((t) => t !== trim) : [...trims, trim]
    );
  };

  const removeMake = (make: string) => {
    console.log('[VehicleSelector] removeMake called', { make, type: typeof make });
    toggleMake(make);
  };
  const removeModel = (model: string) => {
    console.log('[VehicleSelector] removeModel called', { model, type: typeof model });
    toggleModel(model);
  };
  const removeTrim = (trim: string) => {
    console.log('[VehicleSelector] removeTrim called', { trim, type: typeof trim });
    toggleTrim(trim);
  };

  console.log('[VehicleSelector] RENDER', {
    makes,
    makesType: makes.map(m => ({ value: m, type: typeof m })),
    models,
    trims
  });

  return (
    <div className="space-y-4" data-v="2">
      {/* Make Selector */}
      <div className="space-y-2" ref={makeRef}>
        <label className="text-sm font-medium">Make</label>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={showMakeDropdown}
            className="w-full justify-between"
            onClick={() => setShowMakeDropdown(!showMakeDropdown)}
          >
            {makes.length > 0 ? makes[0] : 'Select make...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {showMakeDropdown && (
            <div className="absolute top-full mt-1 z-50 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
              <RadioGroup value={makes[0] || ''} onValueChange={toggleMake}>
                <div className="p-2 space-y-1">
                  {allMakes.map((make) => (
                    <label
                      key={make}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                    >
                      <RadioGroupItem value={make} id={`make-${make}`} />
                      <span className="text-sm">{make}</span>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}
        </div>
        {makes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {makes
              .filter(make => make != null && make !== '')
              .map((make) => {
                console.log('[VehicleSelector] Rendering make chip', { make, type: typeof make, stringValue: String(make) });
                const makeStr = String(make);
                console.log('[VehicleSelector] makeStr created', { makeStr, type: typeof makeStr });
                return (
                  <div
                    key={makeStr}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                  >
                    <span>{makeStr}</span>
                    <button
                      type="button"
                      onClick={() => removeMake(make)}
                      className="inline-flex items-center hover:text-destructive"
                      aria-label={`Remove ${makeStr}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Models Selector */}
      <div className="space-y-2" ref={modelRef}>
        <label className="text-sm font-medium">Models</label>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={makes.length === 0}
            aria-expanded={showModelDropdown}
            className="w-full justify-between"
            onClick={() => setShowModelDropdown(!showModelDropdown)}
          >
            {models.length > 0
              ? `${models.length} selected`
              : makes.length === 0
              ? 'Select makes first...'
              : 'Select models...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {showModelDropdown && availableModels.length > 0 && (
            <div className="absolute top-full mt-1 z-50 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
              <div className="p-2 space-y-1">
                {availableModels.map((model) => (
                  <label
                    key={model}
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={models.includes(model)}
                      onCheckedChange={() => toggleModel(model)}
                    />
                    <span className="text-sm">{model}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        {models.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {models
              .filter(model => model != null && model !== '')
              .map((model) => {
                const modelStr = String(model);
                return (
                  <div
                    key={modelStr}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                  >
                    <span>{modelStr}</span>
                    <button
                      type="button"
                      onClick={() => removeModel(model)}
                      className="inline-flex items-center hover:text-destructive"
                      aria-label={`Remove ${modelStr}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Trims Selector */}
      <div className="space-y-2" ref={trimRef}>
        <label className="text-sm font-medium">Preferred trims (optional)</label>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={models.length === 0}
            aria-expanded={showTrimDropdown}
            className="w-full justify-between"
            onClick={() => setShowTrimDropdown(!showTrimDropdown)}
          >
            {trims.length > 0
              ? `${trims.length} selected`
              : models.length === 0
              ? 'Select models first...'
              : 'Select trims (optional)...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {showTrimDropdown && availableTrims.length > 0 && (
            <div className="absolute top-full mt-1 z-50 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
              <div className="p-2 space-y-1">
                {availableTrims.map((trim) => (
                  <label
                    key={trim}
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={trims.includes(trim)}
                      onCheckedChange={() => toggleTrim(trim)}
                    />
                    <span className="text-sm">{trim}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        {trims.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {trims
              .filter(trim => trim != null && trim !== '')
              .map((trim) => {
                const trimStr = String(trim);
                return (
                  <div
                    key={trimStr}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                  >
                    <span>{trimStr}</span>
                    <button
                      type="button"
                      onClick={() => removeTrim(trim)}
                      className="inline-flex items-center hover:text-destructive"
                      aria-label={`Remove ${trimStr}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
