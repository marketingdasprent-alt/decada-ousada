
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { FormField } from './DynamicFieldEditor';
import { PhoneInput } from '@/components/ui/phone-input';

interface DynamicFormRendererProps {
  fields: FormField[];
  values: Record<string, any>;
  onValueChange: (fieldId: string, value: any) => void;
  errors?: Record<string, string>;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  fields,
  values,
  onValueChange,
  errors = {}
}) => {
  const renderField = (field: FormField) => {
    const value = values[field.id] || '';
    const error = errors[field.id];

    const commonProps = {
      id: field.id,
      className: cn(
        "bg-black border-yellow-500/30 text-white placeholder-gray-400 focus:border-yellow-500",
        error && "border-red-500"
      )
    };

    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <Input
            {...commonProps}
            type={field.type}
            value={value}
            onChange={(e) => onValueChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'tel':
      case 'phone':
        return (
          <PhoneInput
            id={field.id}
            value={value}
            onChange={(newValue) => onValueChange(field.id, newValue)}
            defaultCountry="PT"
            className={cn(
              "[&_button]:bg-black [&_button]:border-yellow-500/30 [&_button]:text-white",
              "[&_input]:bg-black [&_input]:border-yellow-500/30 [&_input]:text-white [&_input]:placeholder-gray-400",
              error && "[&_button]:border-red-500 [&_input]:border-red-500"
            )}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            value={value}
            onChange={(e) => onValueChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case 'select':
        return (
          <Select value={value} onValueChange={(val) => onValueChange(field.id, val)}>
            <SelectTrigger className={commonProps.className}>
              <SelectValue placeholder={field.placeholder || 'Selecionar...'} />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-yellow-500/30">
              {field.options?.map((option) => (
                <SelectItem 
                  key={option} 
                  value={option} 
                  className="text-white hover:bg-gray-800"
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-black border-yellow-500/30 text-white hover:bg-gray-800 hover:text-white focus:border-yellow-500",
                  !value && "text-gray-400",
                  error && "border-red-500"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {value ? 
                  format(new Date(value), "PPP", { locale: pt }) : 
                  <span>{field.placeholder || 'Selecionar data'}</span>
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-yellow-500/30" align="start">
              <CalendarComponent
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => onValueChange(field.id, date?.toISOString().split('T')[0])}
                disabled={(date) => date < new Date()}
                initialFocus
                className="text-white"
              />
            </PopoverContent>
          </Popover>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true}
              onCheckedChange={(checked) => onValueChange(field.id, checked)}
              className="border-yellow-500/30 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
            />
            <Label htmlFor={field.id} className="text-gray-300">
              {field.placeholder || 'Aceito os termos'}
            </Label>
          </div>
        );

      case 'radio':
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => onValueChange(field.id, val)}
            className="flex flex-col space-y-2"
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem 
                  value={option} 
                  id={`${field.id}-${option}`}
                  className="border-yellow-500/30 text-yellow-500"
                />
                <Label htmlFor={`${field.id}-${option}`} className="text-gray-300">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      default:
        return <div className="text-red-400">Tipo de campo não suportado: {field.type}</div>;
    }
  };

  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id} className="text-gray-300 font-medium">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          {renderField(field)}
          {errors[field.id] && (
            <p className="text-red-400 text-sm">{errors[field.id]}</p>
          )}
        </div>
      ))}
    </div>
  );
};
