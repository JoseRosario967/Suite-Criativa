// FIX: Import React to use React types like React.Dispatch and React.SetStateAction.
import React, { useState, useEffect } from 'react';

function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = localStorage.getItem(key);
            if (storedValue !== null) {
                return JSON.parse(storedValue);
            }
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
        }
        return defaultValue;
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            // This can happen if localStorage is full
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState];
}

export default usePersistentState;