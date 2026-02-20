/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle } from 'lucide-react';

interface ConflictField {
  field: string;
  localValue: any;
  serverValue: any;
  updatedBy?: string;
}

interface Conflict {
  id: string;
  resourceType: 'quote' | 'material' | 'machine';
  resourceId: string;
  fields: ConflictField[];
}

interface ConflictResolutionModalProps {
  conflicts: Conflict[];
  onResolve: (resolutions: Record<string, 'local' | 'server'>) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function ConflictResolutionModal({
  conflicts,
  onResolve,
  onCancel,
  isOpen,
}: ConflictResolutionModalProps) {
  const [selections, setSelections] = useState<Record<string, 'local' | 'server'>>({});

  const handleResolve = () => {
    onResolve(selections);
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Sync Conflict Detected</DialogTitle>
          </div>
          <DialogDescription>
            Changes were made both locally and on the server. Please choose which version to keep for each field.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="mb-6 border-b pb-4 last:border-b-0">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                {conflict.resourceType.toUpperCase()} - ID: {conflict.resourceId}
              </h3>

              {conflict.fields.map((field) => {
                const fieldKey = `${conflict.id}:${field.field}`;
                const isSame = field.localValue === field.serverValue;

                return (
                  <div key={fieldKey} className="mb-4 p-3 bg-muted/50 rounded-md">
                    <Label className="font-medium mb-2 block capitalize">
                      {field.field.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>

                    {isSame ? (
                      <p className="text-sm text-muted-foreground">No conflict - values are identical</p>
                    ) : (
                      <RadioGroup
                        value={selections[fieldKey] || 'local'}
                        onValueChange={(value: 'local' | 'server') => {
                          setSelections({ ...selections, [fieldKey]: value });
                        }}
                      >
                        <div className="flex items-start space-x-2 mb-2">
                          <RadioGroupItem value="local" id={`${fieldKey}-local`} />
                          <div className="flex-1">
                            <Label htmlFor={`${fieldKey}-local`} className="font-normal cursor-pointer">
                              <span className="text-xs text-blue-600 font-semibold">LOCAL</span>
                              <p className="mt-1 text-sm">{formatValue(field.localValue)}</p>
                            </Label>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2">
                          <RadioGroupItem value="server" id={`${fieldKey}-server`} />
                          <div className="flex-1">
                            <Label htmlFor={`${fieldKey}-server`} className="font-normal cursor-pointer">
                              <span className="text-xs text-green-600 font-semibold">SERVER</span>
                              {field.updatedBy && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (by {field.updatedBy})
                                </span>
                              )}
                              <p className="mt-1 text-sm">{formatValue(field.serverValue)}</p>
                            </Label>
                          </div>
                        </div>
                      </RadioGroup>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleResolve}>
            Apply Selected Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
