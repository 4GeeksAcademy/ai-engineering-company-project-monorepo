"use client";

import { useState, useCallback } from "react";

interface AccordionItem {
  /** Unique identifier */
  id: string;
  /** Title displayed in the trigger button */
  title: string;
  /** Content displayed when expanded */
  content: React.ReactNode;
}

interface AccordionProps {
  /** Array of accordion items */
  items: AccordionItem[];
  /** Allow multiple items to be open */
  multiple?: boolean;
  /** IDs of items that should be open by default */
  defaultOpen?: string[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Accordion - Accessible expandable content component
 *
 * @accessibility
 * - Uses button elements for expand triggers
 * - aria-expanded indicates open/closed state
 * - aria-controls links trigger to panel
 * - aria-labelledby links panel to trigger
 * - Keyboard navigation: Enter/Space to toggle, Arrow keys to move between items
 * - region role with proper labelling
 *
 * @example
 * <Accordion
 *   items={[
 *     { id: "1", title: "Section 1", content: <p>Content 1</p> },
 *     { id: "2", title: "Section 2", content: <p>Content 2</p> },
 *   ]}
 * />
 */
export default function Accordion({
  items,
  multiple = false,
  defaultOpen = [],
  className = "",
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(defaultOpen)
  );

  const toggleItem = useCallback(
    (id: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (!multiple) {
            next.clear();
          }
          next.add(id);
        }
        return next;
      });
    },
    [multiple]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex: number | null = null;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          nextIndex = (currentIndex + 1) % items.length;
          break;
        case "ArrowUp":
          e.preventDefault();
          nextIndex = (currentIndex - 1 + items.length) % items.length;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = items.length - 1;
          break;
      }

      if (nextIndex !== null) {
        const nextButton = document.querySelector(
          `[data-accordion-trigger="${items[nextIndex].id}"]`
        ) as HTMLButtonElement;
        nextButton?.focus();
      }
    },
    [items]
  );

  return (
    <div className={`space-y-2 ${className}`} role="presentation">
      {items.map((item, index) => {
        const isOpen = openItems.has(item.id);
        const triggerId = `accordion-trigger-${item.id}`;
        const panelId = `accordion-panel-${item.id}`;

        return (
          <div key={item.id} className="border border-gray-200 rounded-lg dark:border-gray-700">
            <h3>
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                data-accordion-trigger={item.id}
                onClick={() => toggleItem(item.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`
                  flex w-full items-center justify-between p-4 text-left font-medium
                  transition-colors hover:bg-gray-50 dark:hover:bg-gray-800
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600
                  ${isOpen ? "text-blue-600" : "text-gray-900 dark:text-white"}
                `}
              >
                <span>{item.title}</span>
                <span
                  aria-hidden="true"
                  className={`flex-shrink-0 ml-4 h-5 w-5 transform transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="px-4 pb-4 text-gray-600 dark:text-gray-300"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
