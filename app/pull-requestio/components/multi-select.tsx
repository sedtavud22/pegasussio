"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, X, Check, User } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  avatar?: string;
}

interface MultiSelectProps {
  options: SelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label: string;
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder,
  label,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== value));
  };

  const getOptionByValue = (value: string) => {
    return options.find((opt) => opt.value === value);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {label}
      </label>
      <div
        className="relative w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm cursor-pointer min-h-[38px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 flex flex-wrap gap-1.5">
            {selectedValues.length === 0 ? (
              <span className="text-zinc-500 text-sm">
                {placeholder || "Select..."}
              </span>
            ) : (
              selectedValues.map((value) => {
                const option = getOptionByValue(value);
                return (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-medium"
                  >
                    {option?.avatar && (
                      <img
                        src={option.avatar}
                        alt={option.label}
                        className="h-4 w-4 rounded-full"
                      />
                    )}
                    {option?.label || value}
                    <button
                      onClick={(e) => handleRemove(value, e)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedValues.length > 0 && (
              <button
                onClick={handleClearAll}
                className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded p-1"
                title="Clear all"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            )}
            <ChevronDown
              className={`h-4 w-4 text-zinc-400 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800">
          <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 rounded-md border-none focus:ring-1 focus:ring-blue-500 outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-4 text-xs text-center text-zinc-500">
                No results found
              </div>
            ) : (
              <>
                {selectedValues.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange([]);
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 mb-1"
                  >
                    Clear all ({selectedValues.length} selected)
                  </button>
                )}
                {filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(option.value);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : ""
                      }`}
                    >
                      <span className="flex items-center gap-2 flex-1 min-w-0">
                        {option.avatar ? (
                          <img
                            src={option.avatar}
                            alt={option.label}
                            className="h-6 w-6 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-zinc-400" />
                          </div>
                        )}
                        <span className="truncate">{option.label}</span>
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
