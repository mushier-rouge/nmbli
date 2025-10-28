'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getAllMakes, getModelsForMakes, vehicles } from '@/lib/data/vehicles';

const OTHER_MODEL_VALUE = '__other_model__';
const OTHER_TRIM_VALUE = '__other_trim__';

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
  const [customModelText, setCustomModelText] = useState('');
  const [customTrimText, setCustomTrimText] = useState('');

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
    // Only allow selecting one make at a time - if clicking the same make, deselect it
    const newMakes = makes.includes(make) ? [] : [make];
    onMakesChange(newMakes);

    // Clear models and trims when changing makes
    if (newMakes.length === 0 || newMakes[0] !== makes[0]) {
      onModelsChange([]);
      onTrimsChange([]);
    }

    // Close dropdown after selection
    setShowMakeDropdown(false);
  };

  const toggleModel = (model: string) => {
    // Only allow selecting one model at a time - if clicking the same model, deselect it
    const newModels = models.includes(model) ? [] : [model];
    onModelsChange(newModels);

    // Clear trims when changing models
    if (newModels.length === 0 || newModels[0] !== models[0]) {
      onTrimsChange([]);
    }

    // Clear custom model text if switching away from "Other"
    if (model !== OTHER_MODEL_VALUE) {
      setCustomModelText('');
    }

    // Close dropdown after selection (but keep open if "Other" is selected for text input)
    if (model !== OTHER_MODEL_VALUE) {
      setShowModelDropdown(false);
    }
  };

  const toggleTrim = (trim: string) => {
    // Only allow selecting one trim at a time - if clicking the same trim, deselect it
    const newTrims = trims.includes(trim) ? [] : [trim];
    onTrimsChange(newTrims);

    // Clear custom trim text if switching away from "Other"
    if (trim !== OTHER_TRIM_VALUE) {
      setCustomTrimText('');
    }

    // Close dropdown after selection (but keep open if "Other" is selected for text input)
    if (trim !== OTHER_TRIM_VALUE) {
      setShowTrimDropdown(false);
    }
  };

  const removeMake = (make: string) => {
    toggleMake(make);
  };
  const removeModel = (model: string) => {
    toggleModel(model);
  };
  const removeTrim = (trim: string) => {
    toggleTrim(trim);
  };

  return (
    <div className="space-y-6" data-v="2">
      {/* Make Selector */}
      <div className="space-y-2" ref={makeRef}>
        <label className="text-base font-semibold">Make</label>
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
        <label className="text-base font-semibold">Model</label>
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
              ? models[0] === OTHER_MODEL_VALUE
                ? `Other: ${customModelText || '...'}`
                : models[0]
              : makes.length === 0
              ? 'Select make first...'
              : 'Select model...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {showModelDropdown && availableModels.length > 0 && (
            <div className="absolute top-full mt-1 z-50 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
              <RadioGroup value={models[0] || ''} onValueChange={toggleModel}>
                <div className="p-2 space-y-1">
                  {availableModels.map((model) => (
                    <label
                      key={model}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                    >
                      <RadioGroupItem value={model} id={`model-${model}`} />
                      <span className="text-sm">{model}</span>
                    </label>
                  ))}
                  <label
                    key="other"
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                  >
                    <RadioGroupItem value={OTHER_MODEL_VALUE} id="model-other" />
                    <span className="text-sm">Other</span>
                  </label>
                </div>
              </RadioGroup>
              {models[0] === OTHER_MODEL_VALUE && (
                <div className="px-2 pb-2">
                  <Input
                    placeholder="Specify model (max 40 chars)"
                    maxLength={40}
                    value={customModelText}
                    onChange={(e) => setCustomModelText(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}
        </div>
        {models.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {models
              .filter(model => model != null && model !== '')
              .map((model) => {
                const displayText = model === OTHER_MODEL_VALUE
                  ? `Other: ${customModelText || '...'}`
                  : String(model);
                return (
                  <div
                    key={model}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                  >
                    <span>{displayText}</span>
                    <button
                      type="button"
                      onClick={() => removeModel(model)}
                      className="inline-flex items-center hover:text-destructive"
                      aria-label={`Remove ${displayText}`}
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
        <label className="text-base font-semibold">Preferred trim (optional)</label>
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
              ? trims[0] === OTHER_TRIM_VALUE
                ? `Other: ${customTrimText || '...'}`
                : trims[0]
              : models.length === 0
              ? 'Select model first...'
              : 'Select trim (optional)...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {showTrimDropdown && models.length > 0 && (
            <div className="absolute top-full mt-1 z-50 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
              <RadioGroup value={trims[0] || ''} onValueChange={toggleTrim}>
                <div className="p-2 space-y-1">
                  {availableTrims.map((trim) => (
                    <label
                      key={trim}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                    >
                      <RadioGroupItem value={trim} id={`trim-${trim}`} />
                      <span className="text-sm">{trim}</span>
                    </label>
                  ))}
                  <label
                    key="other"
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                  >
                    <RadioGroupItem value={OTHER_TRIM_VALUE} id="trim-other" />
                    <span className="text-sm">Other</span>
                  </label>
                </div>
              </RadioGroup>
              {trims[0] === OTHER_TRIM_VALUE && (
                <div className="px-2 pb-2">
                  <Input
                    placeholder="Specify trim (max 40 chars)"
                    maxLength={40}
                    value={customTrimText}
                    onChange={(e) => setCustomTrimText(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}
        </div>
        {trims.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {trims
              .filter(trim => trim != null && trim !== '')
              .map((trim) => {
                const displayText = trim === OTHER_TRIM_VALUE
                  ? `Other: ${customTrimText || '...'}`
                  : String(trim);
                return (
                  <div
                    key={trim}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                  >
                    <span>{displayText}</span>
                    <button
                      type="button"
                      onClick={() => removeTrim(trim)}
                      className="inline-flex items-center hover:text-destructive"
                      aria-label={`Remove ${displayText}`}
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
