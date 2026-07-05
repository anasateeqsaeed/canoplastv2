import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Product {
  code: string;
  name: string;
}

interface ProductLookupInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectProduct?: (product: Product) => void;
  products: Product[];
  searchBy: 'code' | 'name';
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function ProductLookupInput({
  value,
  onChange,
  onSelectProduct,
  products,
  searchBy,
  placeholder,
  disabled,
  required,
  id,
}: ProductLookupInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter products based on input value
  useEffect(() => {
    if (!value || value.length < 1) {
      setFilteredProducts([]);
      return;
    }

    const searchValue = value.toLowerCase();
    const filtered = products.filter((product) => {
      if (searchBy === 'code') {
        return product.code.toLowerCase().includes(searchValue);
      } else {
        return product.name.toLowerCase().includes(searchValue);
      }
    }).slice(0, 8); // Limit to 8 suggestions

    setFilteredProducts(filtered);
  }, [value, products, searchBy]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (product: Product) => {
    onSelectProduct?.(product);
    setIsOpen(false);
    setFilteredProducts([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    if (value && filteredProducts.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
      />
      
      {isOpen && filteredProducts.length > 0 && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredProducts.map((product, index) => (
            <button
              key={`${product.code}-${index}`}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                "flex items-center justify-between gap-2"
              )}
              onClick={() => handleSelect(product)}
            >
              <span className="font-mono text-xs text-muted-foreground min-w-[80px]">
                {product.code}
              </span>
              <span className="flex-1 truncate">{product.name}</span>
            </button>
          ))}
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-t border-border bg-muted/50">
            Type to search existing products
          </div>
        </div>
      )}
    </div>
  );
}
