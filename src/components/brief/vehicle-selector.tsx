'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    const newMakes = makes.includes(make)
      ? makes.filter((m) => m !== make)
      : [...makes, make];
    onMakesChange(newMakes);

    // Clear models and trims that are no longer available
    const newAvailableModels = getModelsForMakes(newMakes);
    const filteredModels = models.filter((m) => newAvailableModels.includes(m));
    if (filteredModels.length !== models.length) {
      onModelsChange(filteredModels);
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

  const removeMake = (make: string) => toggleMake(make);
  const removeModel = (model: string) => toggleModel(model);
  const removeTrim = (trim: string) => toggleTrim(trim);

  return (
    <div className="space-y-4" data-v="2">
      {/* Makes Selector */}
      <div className="space-y-2" ref={makeRef}>
        <label className="text-sm font-medium">Makes</label>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={showMakeDropdown}
            className="w-full justify-between"
            onClick={() => setShowMakeDropdown(!showMakeDropdown)}
          >
            {makes.length > 0 ? `${makes.length} selected` : 'Select makes...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {showMakeDropdown && (
            <div className="absolute top-full mt-1 z-50 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
              <div className="p-2 space-y-1">
                {allMakes.map((make) => (
                  <div
                    key={make}
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => toggleMake(make)}
                  >
                    <Checkbox checked={makes.includes(make)} />
                    <span className="text-sm">{make}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {makes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {makes
              .filter(make => make != null && make !== '')
              .map((make) => {
                const makeStr = String(make);
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
                  <div
                    key={model}
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => toggleModel(model)}
                  >
                    <Checkbox checked={models.includes(model)} />
                    <span className="text-sm">{model}</span>
                  </div>
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
                  <div
                    key={trim}
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => toggleTrim(trim)}
                  >
                    <Checkbox checked={trims.includes(trim)} />
                    <span className="text-sm">{trim}</span>
                  </div>
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
