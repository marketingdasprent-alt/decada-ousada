
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CardContent } from '@/components/ui/card';
import { FormField } from './DynamicFieldEditor';
import { FieldTypeSelector } from './FieldTypeSelector';
import { OptionsEditor } from './OptionsEditor';

interface FieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  onUpdate
}) => {
  return (
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FieldTypeSelector 
          value={field.type}
          onChange={(value) => onUpdate({ type: value })}
        />

        <div>
          <Label className="text-gray-300">Rótulo do Campo</Label>
          <Input
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="Ex: Nome Completo"
          />
        </div>

        <div>
          <Label className="text-gray-300">Placeholder</Label>
          <Input
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="Texto de ajuda"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={field.required}
            onCheckedChange={(checked) => onUpdate({ required: checked })}
          />
          <Label className="text-gray-300">Campo Obrigatório</Label>
        </div>
      </div>

      {(field.type === 'select' || field.type === 'radio') && (
        <OptionsEditor
          options={field.options}
          onChange={(options) => onUpdate({ options })}
        />
      )}
    </CardContent>
  );
};
