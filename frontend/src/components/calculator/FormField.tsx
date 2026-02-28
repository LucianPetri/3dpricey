/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  highlight?: boolean;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormFieldRow = memo(({ label, required, highlight, hint, htmlFor, className, children }: FormFieldProps) => (
  <div className={`rounded-lg border border-border/60 bg-card/40 p-3 sm:p-4 transition-colors hover:border-primary/20 hover:bg-card/60 ${highlight ? 'bg-accent/5 border-primary/30' : ''} ${className || ''}`}>
    <div className="font-medium text-xs sm:text-sm flex items-center gap-1.5 text-muted-foreground mb-2">
      <label htmlFor={htmlFor} className="cursor-pointer">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {hint && (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-muted-foreground/70 hover:text-primary cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px] p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{hint}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <div className="w-full">{children}</div>
  </div>
));

FormFieldRow.displayName = "FormFieldRow";

interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  step?: string;
  min?: string | number;
  max?: string | number;
  maxLength?: number;
  className?: string;
  endAdornment?: React.ReactNode;
  id?: string;
  name?: string;
  autoComplete?: string;
}

export const TextField = memo(({ value, onChange, placeholder, type = "text", step, min, max, maxLength, className, endAdornment, id, name, autoComplete = "off" }: TextFieldProps) => (
  <div className="relative flex items-center w-full">
    <Input
      id={id}
      name={name}
      autoComplete={autoComplete}
      type={type}
      step={step}
      min={min}
      max={max}
      maxLength={maxLength}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-background border-input focus:ring-2 focus:ring-primary/20 w-full ${endAdornment ? 'pr-20' : ''} ${className || ''}`}
    />
    {endAdornment && (
      <div className="absolute right-1 top-1/2 -translate-y-1/2">
        {endAdornment}
      </div>
    )}
  </div>
));

TextField.displayName = "TextField";

interface SelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: SelectOption[];
  id?: string;
  name?: string;
}

export const SelectField = memo(({ value, onChange, placeholder, options, id, name }: SelectFieldProps) => (
  <Select name={name} value={value} onValueChange={onChange}>
    <SelectTrigger id={id} className="bg-background">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent className="bg-popover border-border z-50">
      {options.map((option) => (
        <SelectItem key={option.id} value={option.id}>
          {option.label}
          {option.sublabel && <span className="text-muted-foreground ml-1">({option.sublabel})</span>}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
));

SelectField.displayName = "SelectField";
