
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { COUNTRY_CODES, parsePhoneNumber, formatPhoneNumber, validatePhoneNumber, CountryCode } from '@/utils/phoneValidation';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  name?: string;
  error?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = 'Enter phone number',
  name,
  error
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    COUNTRY_CODES.find(c => c.code === 'IN') || COUNTRY_CODES[0]
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [validationError, setValidationError] = useState<string>('');
  const [open, setOpen] = useState(false);

  // Initialize from value
  useEffect(() => {
    if (value) {
      const parsed = parsePhoneNumber(value);
      if (parsed.country) {
        setSelectedCountry(parsed.country);
        setPhoneNumber(parsed.number);
      }
    }
  }, []);

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRY_CODES.find(c => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
      setPhoneNumber('');
      setValidationError('');
      onChange(country.dialCode);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const digitsOnly = input.replace(/\D/g, '');
    
    // Enforce max length
    if (digitsOnly.length > selectedCountry.maxLength) {
      return;
    }
    
    setPhoneNumber(digitsOnly);
    
    // Validate only if user has entered something
    if (digitsOnly.length > 0) {
      const validation = validatePhoneNumber(digitsOnly, selectedCountry);
      setValidationError(validation.error || '');
    } else {
      setValidationError('');
    }
    
    // Update parent with full phone number
    const fullNumber = digitsOnly ? `${selectedCountry.dialCode} ${digitsOnly}` : selectedCountry.dialCode;
    onChange(fullNumber);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
      return;
    }
    // Allow Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
    if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
      return;
    }
    // Allow arrow keys
    if (e.keyCode >= 35 && e.keyCode <= 40) {
      return;
    }
    // Prevent if not a number
    if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  const displayValue = phoneNumber ? formatPhoneNumber(phoneNumber, selectedCountry) : '';
  const showError = error || validationError;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[180px] justify-between"
              disabled={disabled}
            >
              {selectedCountry.dialCode} ({selectedCountry.code})
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {COUNTRY_CODES.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.dialCode} ${country.code}`}
                      onSelect={() => {
                        handleCountryChange(country.code);
                        setOpen(false);
                      }}
                      className={cn(
                        selectedCountry.code === country.code && "bg-accent"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{country.dialCode}</span>
                        <span className="text-sm text-gray-600">{country.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        <div className="flex-1 relative">
          <Input
            type="tel"
            name={name}
            value={displayValue}
            onChange={handlePhoneChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              showError && 'border-red-500 focus:ring-red-500',
              'pr-20'
            )}
            maxLength={selectedCountry.maxLength + 5} // Extra for formatting
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            {phoneNumber.length}/{selectedCountry.minLength === selectedCountry.maxLength ? selectedCountry.minLength : selectedCountry.maxLength}
          </div>
        </div>
      </div>
      
      {showError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span>⚠️</span>
          {showError}
        </p>
      )}
      
      {!showError && selectedCountry.format && phoneNumber && (
        <p className="text-xs text-gray-500">
          Format: {selectedCountry.format.replace(/X/g, '0')}
        </p>
      )}
    </div>
  );
};
