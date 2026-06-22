import React from 'react';

export function highlightText(text: string | null | undefined): React.ReactNode {
  if (!text) return '';

  const regex = /\b(erp|crm|excel|sap|salesforce|hubspot|tableau|power\s?bi|dynamics\s?365|oracle\s?erp|zoho|pipedrive)\b/gi;
  const parts = text.split(regex);
  if (parts.length === 1) {
    return text;
  }

  const matches = text.match(regex) || [];
  let matchIndex = 0;

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = index % 2 === 1;
        if (isMatch) {
          const matchVal = matches[matchIndex++];
          return (
            <mark
              key={index}
              className="highlight-context-badge"
            >
              {matchVal}
            </mark>
          );
        }
        return part;
      })}
    </>
  );
}
