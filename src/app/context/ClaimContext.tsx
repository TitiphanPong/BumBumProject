'use client';

import { createContext, useContext, useState } from 'react';
import { useEffect } from 'react';



const ClaimContext = createContext<any>(null);

export const ClaimProvider = ({ children }: { children: React.ReactNode }) => {
  const [claims, setClaims] = useState<any[]>([]);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const res = await fetch('/api/get-claims');
        const data = await res.json();
        setClaims(data);
      } catch (error) {
        console.error('Error fetching claims:', error);
      }
    };
    fetchClaims();
  }, []);


  const addClaim = (claim: any) => {
    setClaims(prev => [...prev, { id: Date.now().toString(), ...claim }]);
  };

  const deleteClaim = (id: string) => {
    setClaims(prev => prev.filter(item => item.id !== id));
  };

  return (
    <ClaimContext.Provider value={{ claims, addClaim, deleteClaim, setClaims }}>
      {children}
    </ClaimContext.Provider>
  );
};

export const useClaim = () => useContext(ClaimContext);
